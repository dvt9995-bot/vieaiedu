import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/shop";
import { notify } from "@/lib/notify";

// Đơn hàng của shop (người bán)
export async function GET() {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_orders").select("*, shop_order_items(*)").eq("shop_id", u.shopId).neq("status", "pending").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ orders: data ?? [] });
}

// Đánh dấu đã giao (vật lý) + mã vận đơn
export async function PATCH(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { id, tracking_code, carrier } = await req.json();
  const { data: o } = await admin.from("shop_orders").select("id, shop_id, buyer_id, status").eq("id", id).maybeSingle();
  if (!o || o.shop_id !== u.shopId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["paid"].includes(o.status as string)) return NextResponse.json({ error: "Đơn không ở trạng thái giao được" }, { status: 400 });
  await admin.from("shop_orders").update({ status: "shipped", shipped_at: new Date().toISOString(), tracking_code: tracking_code || null, carrier: carrier || null }).eq("id", id);
  if (o.buyer_id) await notify({ userId: o.buyer_id as string, type: "transactional", title: "📦 Đơn hàng đang được giao", body: `Người bán đã gửi hàng${tracking_code ? ` · mã vận đơn ${tracking_code}` : ""}. Theo dõi ở Đơn của tôi.`, href: "/shop/orders" });
  return NextResponse.json({ ok: true });
}
