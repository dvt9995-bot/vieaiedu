import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data: orders } = await admin.from("shop_orders").select("total, fee_amount, seller_amount, status, escrow_status");
  const rows = (orders || []) as Record<string, unknown>[];
  const sum = (f: (o: Record<string, unknown>) => boolean, k: string) => rows.filter(f).reduce((n, o) => n + ((o[k] as number) || 0), 0);
  const overview = {
    held: sum((o) => o.escrow_status === "held", "total"),                 // đang tạm giữ
    released_seller: sum((o) => o.escrow_status === "released", "seller_amount"), // đã trả người bán
    fee_collected: sum((o) => ["held", "released"].includes(o.escrow_status as string), "fee_amount"), // phí sàn thu
    refunded: sum((o) => o.escrow_status === "refunded", "total"),
    orders_paid: rows.filter((o) => o.status !== "pending" && o.status !== "cancelled").length,
    revenue: sum((o) => ["held", "released"].includes(o.escrow_status as string), "total"), // GMV
  };
  const counts = {
    shops_pending: (await admin.from("shops").select("id", { count: "exact", head: true }).eq("status", "pending")).count || 0,
    products_pending: (await admin.from("shop_products").select("id", { count: "exact", head: true }).eq("review_status", "pending").eq("status", "published")).count || 0,
    disputes_open: (await admin.from("shop_disputes").select("id", { count: "exact", head: true }).eq("status", "open")).count || 0,
  };
  const { data: recent } = await admin.from("shop_orders").select("id, total, status, escrow_status, created_at, shops(name)").order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ overview, counts, recent: recent ?? [] });
}
