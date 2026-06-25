import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";
import { orderCode, sepayQrUrl } from "@/lib/sepay";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { notifyAdmins } from "@/lib/notify";

// Khóa mà landing này bán (gắn cứng để chống lạm dụng tạo đơn khóa khác)
const ALLOWED_SLUGS = new Set(["xay-kenh-tu-dong-bang-ai-kiem-tien-tu-facebook-va-affiliate-shopee"]);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// POST: tạo (hoặc tìm) tài khoản theo email + tạo đơn pending + trả QR SePay.
export async function POST(req: Request) {
  if (!rateLimit(`lpco:${clientIp(req)}`, 12, 60_000)) return NextResponse.json({ error: "Bạn thao tác quá nhanh, thử lại sau." }, { status: 429 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const slug = String(b.slug || "").trim() || [...ALLOWED_SLUGS][0];
  if (!name) return NextResponse.json({ error: "Vui lòng nhập họ tên." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Vui lòng nhập số điện thoại." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Vui lòng nhập email hợp lệ để nhận tài khoản & khóa học." }, { status: 400 });
  if (!ALLOWED_SLUGS.has(slug)) return NextResponse.json({ error: "Khóa học không hợp lệ." }, { status: 400 });

  const course = await getPurchasableCourse(slug);
  if (!course) return NextResponse.json({ error: "Khóa học không tồn tại." }, { status: 404 });
  const amount = course.price || 0;

  // Tìm tài khoản theo email; chưa có thì TẠO tự động (xác nhận sẵn, mật khẩu ngẫu nhiên)
  let userId: string | null = null;
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing?.id) userId = existing.id as string;
  if (!userId) {
    const password = `${globalThis.crypto.randomUUID()}Aa1!`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (created?.user) userId = created.user.id;
    else if (cErr) {
      // Email đã tồn tại (đua request) → lấy lại id qua generateLink
      const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      userId = link?.user?.id || null;
    }
  }
  if (!userId) return NextResponse.json({ error: "Không tạo được tài khoản, vui lòng thử lại." }, { status: 500 });

  // Cập nhật hồ sơ (tên, SĐT, email)
  await admin.from("profiles").update({ full_name: name, phone, email }).eq("id", userId);

  // Tạo đơn pending nguồn 'landing'
  const { data: order, error: oErr } = await admin.from("orders")
    .insert({ user_id: userId, course_slug: slug, amount, status: "pending", source: "landing" })
    .select("id").single();
  if (oErr || !order) return NextResponse.json({ error: "Không tạo được đơn hàng." }, { status: 500 });

  const code = orderCode(order.id as string);
  await admin.from("orders").update({ sepay_ref: code }).eq("id", order.id);
  const qrUrl = await sepayQrUrl(amount, code);

  await notifyAdmins("🟡 Đơn mới từ Landing", `${name} (${phone} · ${email}) đặt "${course.title}" — chờ thanh toán.`, "/admin");
  return NextResponse.json({ ok: true, orderId: order.id, code, amount, qrUrl });
}

// GET ?code=XXX → trạng thái thanh toán (poll công khai theo MÃ ngẫu nhiên, không cần đăng nhập)
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "unknown" });
  const { data } = await admin.from("orders").select("status").eq("sepay_ref", code).maybeSingle();
  return NextResponse.json({ paid: data?.status === "paid", status: data?.status ?? "unknown" });
}
