import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletChange } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { formatVND } from "@/lib/format";

// Tự giải ngân: đơn đã thanh toán (held), quá hạn giữ tiền, KHÔNG bị tranh chấp → cộng tiền vào ví người bán.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : await isCurrentUserAdmin();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const nowIso = new Date().toISOString();
  // Tự hủy đơn chưa thanh toán quá 24h (dọn rác)
  await admin.from("shop_orders").update({ status: "cancelled" }).eq("status", "pending").lt("created_at", new Date(Date.now() - 24 * 3600000).toISOString());

  const { data: due } = await admin.from("shop_orders")
    .select("id, shop_id, seller_amount, total, status")
    .eq("escrow_status", "held").lte("release_at", nowIso).neq("status", "disputed").limit(200);

  let released = 0;
  for (const o of due || []) {
    // cổng idempotency: chỉ xử lý nếu chuyển held → released
    const { data: gate } = await admin.from("shop_orders").update({ escrow_status: "released", status: "completed", completed_at: nowIso }).eq("id", o.id).eq("escrow_status", "held").select("id");
    if (!gate || !gate.length) continue;
    const { data: shop } = await admin.from("shops").select("owner_id, name").eq("id", o.shop_id).maybeSingle();
    if (shop?.owner_id && (o.seller_amount as number) > 0) {
      await walletChange(shop.owner_id as string, "real", o.seller_amount as number, "Giải ngân đơn hàng sàn", o.id as string);
      await admin.from("escrow_ledger").insert({ order_id: o.id, shop_id: o.shop_id, type: "release", amount: o.seller_amount, note: "Giải ngân cho người bán" });
      await notify({ userId: shop.owner_id as string, type: "transactional", title: "💰 Đã giải ngân đơn hàng", body: `Bạn nhận ${formatVND(o.seller_amount as number)} vào ví (đơn đã hoàn tất). Vào ví để rút.`, href: "/wallet" });
    }
    released++;
  }
  return NextResponse.json({ ok: true, released });
}
