import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/shop";

export async function GET() {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data: orders } = await admin.from("shop_orders").select("total, seller_amount, status, escrow_status").eq("shop_id", u.shopId);
  const rows = (orders || []) as Record<string, unknown>[];
  const sum = (f: (o: Record<string, unknown>) => boolean, k: string) => rows.filter(f).reduce((n, o) => n + ((o[k] as number) || 0), 0);
  const overview = {
    revenue: sum((o) => o.status !== "pending" && o.status !== "cancelled", "total"),
    pending_escrow: sum((o) => o.escrow_status === "held", "seller_amount"),
    received: sum((o) => o.escrow_status === "released", "seller_amount"),
    orders: rows.filter((o) => o.status !== "pending").length,
  };
  const lowStock = (await admin.from("shop_products").select("title, stock").eq("shop_id", u.shopId).eq("type", "physical").not("stock", "is", null).lte("stock", 3)).data || [];
  const { data: prods } = await admin.from("shop_products").select("title, views, sold_count").eq("shop_id", u.shopId).order("views", { ascending: false });
  const totalViews = (prods || []).reduce((n, p) => n + ((p.views as number) || 0), 0);
  const analytics = {
    views: totalViews,
    conversion: totalViews > 0 ? Math.round((overview.orders / totalViews) * 1000) / 10 : 0,
    top: (prods || []).slice(0, 5).map((p) => ({ title: p.title, views: (p.views as number) || 0, sold: (p.sold_count as number) || 0 })),
  };
  return NextResponse.json({ overview, lowStock, analytics });
}
