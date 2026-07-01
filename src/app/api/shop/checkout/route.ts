import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sepayQrUrl } from "@/lib/sepay";
import { rateLimit, clientIp } from "@/lib/ratelimit";

interface InItem { product_id: string; qty: number; variant?: string }

export async function POST(req: Request) {
  if (!rateLimit(`shopco:${clientIp(req)}`, 15, 60_000)) return NextResponse.json({ error: "Thao tác quá nhanh" }, { status: 429 });
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const body = await req.json().catch(() => ({}));
  const ship = body.ship || {};

  // Nguồn item: body.items (mua ngay) hoặc giỏ hàng
  let inItems: InItem[] = Array.isArray(body.items) ? body.items : [];
  if (!inItems.length) {
    const { data: cart } = await admin.from("shop_cart_items").select("product_id, qty, variant").eq("user_id", user.id);
    inItems = (cart || []).map((c) => ({ product_id: c.product_id as string, qty: c.qty as number, variant: (c.variant as string) || undefined }));
  }
  if (!inItems.length) return NextResponse.json({ error: "Giỏ hàng trống" }, { status: 400 });

  const ids = [...new Set(inItems.map((i) => i.product_id))];
  const { data: products } = await admin.from("shop_products").select("id, shop_id, type, title, price, stock, shipping_fee, digital_url, digital_note, category_id, status, review_status, variants, shops(status)").in("id", ids);
  const pmap = new Map((products || []).map((p) => [p.id, p]));
  // Khớp biến thể theo label → dùng giá & tồn của biến thể (nếu có)
  const variantOf = (p: Record<string, unknown>, label?: string) => {
    const vs = Array.isArray(p.variants) ? (p.variants as { label: string; price: number; stock: number }[]) : [];
    return label ? vs.find((v) => v.label === label) : undefined;
  };
  const unitPrice = (p: Record<string, unknown>, label?: string) => { const v = variantOf(p, label); return (v && v.price > 0) ? v.price : (p.price as number); };
  const cats = await admin.from("shop_categories").select("id, fee_percent");
  const feeMap = new Map((cats.data || []).map((c) => [c.id, Number(c.fee_percent) || 0]));

  // Gom theo shop
  const byShop = new Map<string, InItem[]>();
  let hasPhysicalAny = false;
  for (const it of inItems) {
    const p = pmap.get(it.product_id) as Record<string, unknown> | undefined;
    if (!p || p.status !== "published" || p.review_status !== "approved" || (p.shops as { status?: string })?.status !== "approved") continue;
    if (p.type === "physical") {
      hasPhysicalAny = true;
      const v = variantOf(p, it.variant);
      const avail = v ? v.stock : (p.stock as number | null);
      if (avail != null && it.qty > avail) return NextResponse.json({ error: `"${p.title}"${v ? ` (${v.label})` : ""} không đủ hàng (còn ${avail})` }, { status: 409 });
    }
    const arr = byShop.get(p.shop_id as string) || []; arr.push({ ...it, qty: Math.max(1, it.qty) }); byShop.set(p.shop_id as string, arr);
  }
  if (!byShop.size) return NextResponse.json({ error: "Sản phẩm không khả dụng" }, { status: 400 });
  if (hasPhysicalAny && (!ship.name || !ship.phone || !ship.address)) return NextResponse.json({ error: "need_address" }, { status: 400 });

  const code = "SHO" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();
  let grand = 0;

  for (const [shopId, items] of byShop) {
    let subtotal = 0, shipping = 0, fee = 0; let physical = false;
    const orderItems: Record<string, unknown>[] = [];
    for (const it of items) {
      const p = pmap.get(it.product_id) as Record<string, unknown>;
      const unit = unitPrice(p, it.variant);
      const line = unit * it.qty;
      subtotal += line;
      fee += Math.round(line * (feeMap.get(p.category_id as string) || 0) / 100);
      if (p.type === "physical") { physical = true; shipping += (p.shipping_fee as number) || 0; }
      orderItems.push({ product_id: p.id, title: p.title, type: p.type, price: unit, qty: it.qty, variant: it.variant || null, digital_url: p.type === "digital" ? p.digital_url : null, digital_note: p.type === "digital" ? p.digital_note : null });
    }
    const total = subtotal + shipping;
    const seller_amount = subtotal - fee + shipping;
    const feePct = subtotal > 0 ? Math.round((fee / subtotal) * 100) : 0;
    grand += total;
    const { data: order, error } = await admin.from("shop_orders").insert({
      buyer_id: user.id, shop_id: shopId, code, subtotal, shipping_fee: shipping, total, fee_percent: feePct, fee_amount: fee, seller_amount,
      status: "pending", escrow_status: "none", has_physical: physical,
      ship_name: physical ? ship.name : null, ship_phone: physical ? ship.phone : null, ship_address: physical ? ship.address : null,
    }).select("id").single();
    if (error || !order) return NextResponse.json({ error: error?.message || "Lỗi tạo đơn" }, { status: 500 });
    await admin.from("shop_order_items").insert(orderItems.map((o) => ({ ...o, order_id: order.id })));
  }

  // Xóa giỏ (nếu checkout từ giỏ)
  if (!Array.isArray(body.items) || !body.items.length) await admin.from("shop_cart_items").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true, code, amount: grand, qrUrl: await sepayQrUrl(grand, code) });
}
