import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Đánh giá sản phẩm (chỉ người đã mua đơn đó)
export async function POST(req: Request) {
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { product_id, order_id, rating, body } = await req.json();
  // xác minh user đã mua product này trong order của họ
  const { data: it } = await admin.from("shop_order_items").select("id, order_id, shop_orders!inner(buyer_id, status)").eq("product_id", product_id).eq("order_id", order_id).maybeSingle();
  const ord = it?.shop_orders as { buyer_id?: string; status?: string } | undefined;
  if (!it || ord?.buyer_id !== user.id || ord?.status === "pending") return NextResponse.json({ error: "Bạn chưa mua sản phẩm này" }, { status: 403 });
  const r = Math.min(5, Math.max(1, Number(rating) || 5));
  await admin.from("shop_reviews").insert({ product_id, order_id, buyer_id: user.id, rating: r, body: String(body || "").slice(0, 1000) || null });
  // cập nhật điểm trung bình
  const { data: rows } = await admin.from("shop_reviews").select("rating").eq("product_id", product_id);
  const n = (rows || []).length; const avg = n ? (rows || []).reduce((a, x) => a + (x.rating as number), 0) / n : 0;
  await admin.from("shop_products").update({ rating: Math.round(avg * 10) / 10, rating_count: n }).eq("id", product_id);
  return NextResponse.json({ ok: true });
}
