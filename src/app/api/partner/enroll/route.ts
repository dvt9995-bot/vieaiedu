import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";
import { fulfillCourseOrder } from "@/lib/fulfill";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { notifyAdmins } from "@/lib/notify";

// Ghi danh học viên tự động cho đối tác BÊN NGOÀI đã tự thu tiền qua hệ thống thanh toán
// riêng của họ (Magic AI / Long Nam — Google Apps Script + SePay riêng, xem
// magic-ai-handoff/apps-script/magic-ai-backend.gs). KHÔNG dùng cho thanh toán trên
// chính vieaiedu.vn (đã có /api/sepay/webhook + /api/lp/checkout cho việc đó).
//
// Auth: Header "Authorization: Bearer <PARTNER_API_KEY>" (biến môi trường server-only).
// Body: { email, name, phone, orderCode, plan }
//   plan: mã gói phía đối tác (map sang course_slug bên dưới) — hiện chỉ có COURSE/VIP
//         cùng grant 1 khoá "ai-agent-builder"; VIP thêm ghi chú tư vấn 1:1 cho admin.
// Trả về: { ok, username, existing } — KHÔNG trả mật khẩu: tài khoản được gửi email
//   chào mừng kèm magic-link đăng nhập 1-chạm (an toàn hơn gửi mật khẩu dạng chữ).
const PLAN_TO_SLUG: Record<string, string> = {
  COURSE: "ai-agent-builder",
  VIP: "ai-agent-builder",
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const key = process.env.PARTNER_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "partner api chưa cấu hình" }, { status: 503 });
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${key}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`partner-enroll:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  const orderCode = String(b.orderCode || "").trim();
  const plan = String(b.plan || "").trim().toUpperCase();

  if (!isEmail(email)) return NextResponse.json({ ok: false, error: "email không hợp lệ" }, { status: 400 });
  const slug = PLAN_TO_SLUG[plan];
  if (!slug) return NextResponse.json({ ok: false, error: `plan không xác định: ${plan}` }, { status: 400 });

  const course = await getPurchasableCourse(slug);
  if (!course) return NextResponse.json({ ok: false, error: `khoá học chưa tồn tại: ${slug}` }, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });

  // Tìm hoặc tạo tài khoản theo email (mật khẩu ngẫu nhiên — học viên đăng nhập qua magic-link trong email)
  let userId: string | null = null;
  let existing = false;
  const { data: found } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (found?.id) { userId = found.id as string; existing = true; }
  if (!userId) {
    const password = `${globalThis.crypto.randomUUID()}Aa1!`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name },
    });
    if (created?.user) userId = created.user.id;
    else if (cErr) {
      const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      userId = link?.user?.id || null;
      if (userId) existing = true;
    }
  }
  if (!userId) return NextResponse.json({ ok: false, error: "không tạo được tài khoản" }, { status: 500 });

  await admin.from("profiles").update({
    full_name: name || undefined, phone: phone || undefined, email,
  }).eq("id", userId);

  // Đơn đã thanh toán THẬT bên phía Magic AI — ghi nhận trực tiếp ở trạng thái pending
  // rồi để fulfillCourseOrder chuyển paid (tái dùng đúng 1 đường xử lý ghi danh + email + thông báo
  // với mọi đơn khác trên hệ thống, tránh trùng lặp logic).
  const { data: order, error: oErr } = await admin.from("orders")
    .insert({
      user_id: userId, course_slug: slug, amount: course.price, status: "pending",
      source: "landing", sepay_ref: orderCode || undefined,
    })
    .select("id").single();
  if (oErr || !order) return NextResponse.json({ ok: false, error: "không tạo được đơn ghi danh" }, { status: 500 });

  const result = await fulfillCourseOrder(admin, order.id as string, "webhook");
  if (!result.ok) return NextResponse.json({ ok: false, error: "fulfill lỗi" }, { status: 500 });

  if (plan === "VIP") {
    await notifyAdmins("👑 Học viên VIP mới (Magic AI)", `${name} (${phone} · ${email}) — cần Long Nam liên hệ tư vấn 1:1.`, "/admin", { email: true });
  }

  return NextResponse.json({ ok: true, username: email, existing });
}
