import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, notifyAdmins } from "@/lib/notify";
import { getConfig } from "@/lib/settings";
import { formatVND } from "@/lib/format";
import { fulfillCourseOrder, fulfillShopOrder } from "@/lib/fulfill";

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
    // Thử khớp ĐƠN SÀN (mã SHO... — nhiều shop_orders chung 1 mã)
    const { data: sorders } = await admin.from("shop_orders").select("*").eq("status", "pending").limit(300);
    const group = (sorders ?? []).filter((o) => o.code && content.toUpperCase().includes(o.code as string));
    if (group.length) {
      const sum = group.reduce((n, o) => n + (o.total as number), 0);
      if (!amount || amount < sum) return NextResponse.json({ success: true, matched: true, note: "shop amount too low" });
      let done = 0;
      for (const o of group) { const r = await fulfillShopOrder(admin, o.id as string); if (r.ok && "fulfilled" in r && r.fulfilled) done++; }
      if (done) await notifyAdmins("🛒 Đơn sàn mới", `${done} đơn · ${formatVND(sum)}`, "/admin");
      return NextResponse.json({ success: true, matched: true, shop: done });
    }
    return NextResponse.json({ success: true, matched: false });
  }

  if (!amount || amount < order.amount) {
    return NextResponse.json({ success: true, matched: true, note: "amount too low/invalid" });
  }

  // Hoàn tất đơn (ghi danh + hoa hồng + thông báo + email) — dùng chung với admin xác nhận tay.
  await fulfillCourseOrder(admin, order.id as string, "webhook");
  return NextResponse.json({ success: true, matched: true, order: order.id });
}
