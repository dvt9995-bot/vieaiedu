import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPurchasableCourse } from "@/lib/courses";
import { sendOrderReceipt } from "@/lib/email";
import { notify, notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { formatVND } from "@/lib/format";
import { walletChange } from "@/lib/wallet";
import { consumeCoupon } from "@/lib/coupon";
import { ALL_ACCESS, enrollAllPublished } from "@/lib/bundle";

// Webhook SePay gọi khi có giao dịch chuyển khoản tới.
// Cấu hình tại SePay: URL = https://vieaiedu.vn/api/sepay/webhook
// Header xác thực: Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>
export async function POST(req: Request) {
  // BẮT BUỘC có khóa bí mật — KHÔNG xử lý webhook khi chưa cấu hình (chống giả mạo thanh toán)
  const secret = await getConfig("sepay_webhook_key", "SEPAY_WEBHOOK_API_KEY");
  if (!secret) return NextResponse.json({ success: false, error: "webhook chưa cấu hình khóa bảo mật" }, { status: 503 });
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Apikey ${secret}`) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
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
  if (!order) {
    // Không khớp đơn hàng → thử khớp ỦNG HỘ (tùy tâm)
    const { data: dons } = await admin.from("donations").select("*").eq("status", "pending").limit(200);
    const don = (dons ?? []).find((d) => d.sepay_ref && content.toUpperCase().includes(d.sepay_ref));
    if (don) {
      if (!amount || amount < (don.amount as number)) return NextResponse.json({ success: true, matched: true, note: "donation amount too low/invalid" });
      // Cổng idempotency: chỉ xử lý nếu chuyển được pending → paid (chống webhook gọi lại 2 lần)
      const { data: dpaid } = await admin.from("donations").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", don.id).eq("status", "pending").select("id");
      if (!dpaid || dpaid.length === 0) return NextResponse.json({ success: true, matched: true, note: "donation already processed" });
      await notifyAdmins("❤️ Nhận ủng hộ cộng đồng", `${formatVND((amount as number) || (don.amount as number))}${don.message ? ` · "${don.message}"` : ""}`, "/admin");
      if (don.user_id) await notify({ userId: don.user_id as string, type: "transactional", title: "Cảm ơn bạn đã ủng hộ ❤️", body: "Sự ủng hộ của bạn giúp duy trì & phát triển cộng đồng VIE AI EDU. Cảm ơn bạn rất nhiều!", href: "/" });
      return NextResponse.json({ success: true, matched: true, donation: true });
    }
    return NextResponse.json({ success: true, matched: false });
  }

  if (!amount || amount < order.amount) {
    return NextResponse.json({ success: true, matched: true, note: "amount too low/invalid" });
  }

  // Cổng idempotency ATOMIC: chỉ xử lý (ghi danh + hoa hồng) nếu chuyển được pending → paid.
  // Webhook gọi lại / 2 request đua nhau → chỉ 1 lần update đổi dòng, các lần sau bỏ qua.
  const { data: paidRows } = await admin
    .from("orders").update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id).eq("status", "pending").select("id");
  if (!paidRows || paidRows.length === 0) {
    return NextResponse.json({ success: true, matched: true, note: "already processed" });
  }
  await consumeCoupon(order.coupon_code as string | undefined); // tiêu 1 lượt dùng mã (nếu đơn có áp mã)
  const isBundle = order.course_slug === ALL_ACCESS;
  let enrollErr: { message: string } | null = null;
  if (isBundle) {
    await enrollAllPublished(admin, order.user_id);
  } else {
    ({ error: enrollErr } = await admin.from("enrollments").upsert(
      { user_id: order.user_id, course_slug: order.course_slug },
      { onConflict: "user_id,course_slug" }
    ));
  }

  const course = isBundle ? null : await getPurchasableCourse(order.course_slug);
  const courseTitle = isBundle ? "Trọn bộ khóa học (All-access)" : (course?.title ?? order.course_slug);
  const courseHref = isBundle ? "/courses" : course?.format === "live" ? `/live/${order.course_slug}` : `/learn/${order.course_slug}`;

  // Hoa hồng giới thiệu: người được giới thiệu mua đơn THẬT → cộng % vào ví hoa hồng người giới thiệu
  try {
    const { data: buyer } = await admin.from("profiles").select("referred_by, full_name").eq("id", order.user_id).maybeSingle();
    const refId = buyer?.referred_by as string | undefined;
    if (refId && order.amount > 0) {
      const pct = parseInt(await getConfig("referral_commission_pct")) || 0;
      if (pct > 0) {
        const commission = Math.round((order.amount as number) * pct / 100);
        if (commission > 0) {
          await walletChange(refId, "real", commission, `Hoa hồng giới thiệu (${pct}%) từ đơn của ${buyer?.full_name || "học viên"}`, order.id);
          await notify({ userId: refId, type: "transactional", title: `💸 Bạn nhận ${commission.toLocaleString("vi-VN")}đ hoa hồng`, body: `Người bạn giới thiệu vừa mua khóa học. Hoa hồng đã cộng vào ví của bạn.`, href: "/account" });
        }
      }
    }
  } catch {}

  // Cảnh báo admin: đơn mới (luôn) + ghi danh lỗi (critical)
  await notifyAdmins("💰 Đơn hàng mới", `${courseTitle} · ${formatVND(order.amount)}`, "/admin");
  if (enrollErr)
    await notifyAdmins("🔴 Đã thu tiền nhưng ghi danh LỖI", `Đơn ${order.id} (${courseTitle}). Cần ghi danh thủ công cho học viên.`, "/admin", { email: true });
  // Thông báo (in-app + push); email biên lai gửi riêng bên dưới
  await notify({
    userId: order.user_id, type: "transactional",
    title: "Thanh toán thành công 🎉",
    body: `Bạn đã sở hữu "${courseTitle}". Vào học ngay!`,
    href: courseHref, email: false,
  });

  // Gửi biên lai qua email (nếu đã cấu hình Resend)
  try {
    const { data: u } = await admin.auth.admin.getUserById(order.user_id);
    const email = u.user?.email;
    if (email && course) await sendOrderReceipt(email, course.title, order.amount);
  } catch {}

  return NextResponse.json({ success: true, matched: true, order: order.id });
}
