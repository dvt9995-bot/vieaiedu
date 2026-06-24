import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { walletChange } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { formatVND } from "@/lib/format";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_disputes").select("*, shop_orders(total, seller_amount, shop_id, code), profiles(full_name, email)").eq("status", "open").order("created_at", { ascending: false });
  return NextResponse.json({ disputes: data ?? [] });
}

// Xử lý: refund (hoàn tiền người mua vào ví) | release (trả tiền người bán)
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, action, note } = await req.json();
  const { data: d } = await admin.from("shop_disputes").select("id, order_id, buyer_id, status").eq("id", id).maybeSingle();
  if (!d || d.status !== "open") return NextResponse.json({ error: "not open" }, { status: 400 });
  const { data: o } = await admin.from("shop_orders").select("id, total, seller_amount, shop_id, escrow_status").eq("id", d.order_id).maybeSingle();
  if (!o) return NextResponse.json({ error: "order not found" }, { status: 404 });

  if (action === "refund") {
    const { data: gate } = await admin.from("shop_orders").update({ status: "refunded", escrow_status: "refunded" }).eq("id", o.id).eq("escrow_status", "held").select("id");
    if (gate?.length) {
      await walletChange(d.buyer_id as string, "real", o.total as number, "Hoàn tiền đơn hàng (khiếu nại)", o.id as string);
      await admin.from("escrow_ledger").insert({ order_id: o.id, shop_id: o.shop_id, type: "refund", amount: o.total, note: "Hoàn tiền người mua" });
      await notify({ userId: d.buyer_id as string, type: "transactional", title: "💸 Đã hoàn tiền đơn hàng", body: `${formatVND(o.total as number)} đã hoàn vào ví của bạn.`, href: "/wallet" });
    }
  } else if (action === "release") {
    const { data: gate } = await admin.from("shop_orders").update({ status: "completed", escrow_status: "released", completed_at: new Date().toISOString() }).eq("id", o.id).eq("escrow_status", "held").select("id");
    if (gate?.length) {
      const { data: shop } = await admin.from("shops").select("owner_id").eq("id", o.shop_id).maybeSingle();
      if (shop?.owner_id && (o.seller_amount as number) > 0) {
        await walletChange(shop.owner_id as string, "real", o.seller_amount as number, "Giải ngân đơn (xử khiếu nại)", o.id as string);
        await admin.from("escrow_ledger").insert({ order_id: o.id, shop_id: o.shop_id, type: "release", amount: o.seller_amount, note: "Giải ngân (sau khiếu nại)" });
      }
    }
  } else return NextResponse.json({ error: "bad action" }, { status: 400 });

  await admin.from("shop_disputes").update({ status: action === "refund" ? "resolved_refund" : "resolved_release", admin_note: note || null, resolved_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
