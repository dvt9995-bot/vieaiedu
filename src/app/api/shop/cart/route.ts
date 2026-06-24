import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function uid() {
  const s = await createClient();
  if (!s) return null;
  const { data: { user } } = await s.auth.getUser();
  return user?.id || null;
}

export async function GET() {
  const u = await uid();
  if (!u) return NextResponse.json({ items: [] });
  const admin = createAdminClient()!;
  const { data } = await admin.from("shop_cart_items").select("id, qty, variant, product_id, shop_products(id, title, slug, price, type, media, shipping_fee, stock, shops(name, slug, status), status, review_status)").eq("user_id", u);
  const items = (data || []).filter((c) => { const p = c.shop_products as { status?: string; review_status?: string; shops?: { status?: string } } | null; return p?.status === "published" && p?.review_status === "approved" && p?.shops?.status === "approved"; });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await uid();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { product_id, qty, variant } = await req.json();
  if (!product_id) return NextResponse.json({ error: "missing" }, { status: 400 });
  const { error } = await admin.from("shop_cart_items").upsert({ user_id: u, product_id, qty: Math.max(1, Number(qty) || 1), variant: variant || null }, { onConflict: "user_id,product_id,variant" });
  if (error) {
    // fallback nếu unique theo coalesce: thử cập nhật/insert thủ công
    await admin.from("shop_cart_items").insert({ user_id: u, product_id, qty: Math.max(1, Number(qty) || 1), variant: variant || null });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const u = await uid();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { id, qty } = await req.json();
  await admin.from("shop_cart_items").update({ qty: Math.max(1, Number(qty) || 1) }).eq("id", id).eq("user_id", u);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await uid();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  await admin.from("shop_cart_items").delete().eq("id", id).eq("user_id", u);
  return NextResponse.json({ ok: true });
}
