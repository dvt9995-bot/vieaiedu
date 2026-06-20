import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseBySlug } from "@/lib/courses";
import { sendOrderReceipt } from "@/lib/email";
import { notify, notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { formatVND } from "@/lib/format";

// Webhook SePay gọi khi có giao dịch chuyển khoản tới.
// Cấu hình tại SePay: URL = https://vieaiedu.vn/api/sepay/webhook
// Header xác thực: Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>
export async function POST(req: Request) {
  const secret = await getConfig("sepay_webhook_key", "SEPAY_WEBHOOK_API_KEY");
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Apikey ${secret}`) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false }, { status: 400 });

  // SePay payload: { content, transferAmount, transferType, ... }
  const content: string = String(body.content ?? body.description ?? "");
  const amount: number = Number(body.transferAmount ?? body.amount ?? 0);
  if (body.transferType && body.transferType !== "in") {
    return NextResponse.json({ success: true, skipped: "not incoming" });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ success: false, error: "unconfigured" }, { status: 503 });

  // Tìm order theo mã nội dung (content chứa mã VIE...)
  const { data: orders } = await admin
    .from("orders").select("*").eq("status", "pending").limit(200);
  const order = (orders ?? []).find((o) => o.sepay_ref && content.toUpperCase().includes(o.sepay_ref));
  if (!order) return NextResponse.json({ success: true, matched: false });

  if (amount && amount < order.amount) {
    return NextResponse.json({ success: true, matched: true, note: "amount too low" });
  }

  // Đánh dấu đã thanh toán + ghi danh
  await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
  const { error: enrollErr } = await admin.from("enrollments").upsert(
    { user_id: order.user_id, course_slug: order.course_slug },
    { onConflict: "user_id,course_slug" }
  );

  const course = await getCourseBySlug(order.course_slug);
  const courseTitle = course?.title ?? order.course_slug;

  // Cảnh báo admin: đơn mới (luôn) + ghi danh lỗi (critical)
  await notifyAdmins("💰 Đơn hàng mới", `${courseTitle} · ${formatVND(order.amount)}`, "/admin");
  if (enrollErr)
    await notifyAdmins("🔴 Đã thu tiền nhưng ghi danh LỖI", `Đơn ${order.id} (${courseTitle}). Cần ghi danh thủ công cho học viên.`, "/admin", { email: true });
  // Thông báo (in-app + push); email biên lai gửi riêng bên dưới
  await notify({
    userId: order.user_id, type: "transactional",
    title: "Thanh toán thành công 🎉",
    body: `Bạn đã sở hữu khóa "${courseTitle}". Vào học ngay!`,
    href: `/learn/${order.course_slug}`, email: false,
  });

  // Gửi biên lai qua email (nếu đã cấu hình Resend)
  try {
    const { data: u } = await admin.auth.admin.getUserById(order.user_id);
    const email = u.user?.email;
    if (email && course) await sendOrderReceipt(email, course.title, order.amount);
  } catch {}

  return NextResponse.json({ success: true, matched: true, order: order.id });
}
