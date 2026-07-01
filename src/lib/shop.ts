import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const RELEASE_DAYS = 3; // tự giải ngân sau N ngày nếu không có khiếu nại

export interface Variant { label: string; price: number; stock: number }
export interface ShopProduct {
  id: string; shop_id: string; type: string; title: string; slug: string; description?: string;
  price: number; compare_price?: number; category_id?: string; stock?: number | null;
  media?: string[]; options?: { name: string; values: string[] }[]; digital_url?: string; digital_note?: string;
  shipping_fee: number; status: string; review_status: string; sold_count: number; rating: number; rating_count: number;
  variants?: Variant[]; sale_ends_at?: string | null; views?: number; created_at?: string;
  shop?: { name: string; slug: string; logo_url?: string | null } | null; category?: string | null;
}

// Flash sale còn hiệu lực: có giá gạch cao hơn giá bán + (không đặt hạn HOẶC hạn còn trong tương lai)
export function onSale(p: { price: number; compare_price?: number; sale_ends_at?: string | null }): boolean {
  if (!p.compare_price || p.compare_price <= p.price) return false;
  if (p.sale_ends_at && new Date(p.sale_ends_at).getTime() < Date.now()) return false;
  return true;
}
export function discountPct(p: { price: number; compare_price?: number }): number {
  if (!p.compare_price || p.compare_price <= p.price) return 0;
  return Math.round((1 - p.price / p.compare_price) * 100);
}

// User hiện tại + shop đã duyệt (null nếu chưa là người bán). Admin coi như có quyền.
export async function currentShop(): Promise<{ uid: string; role: string; shop: { id: string; status: string } | null } | null> {
  const s = await createClient();
  if (!s) return null;
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: prof } = await (admin ?? s).from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: shop } = await (admin ?? s).from("shops").select("id, status").eq("owner_id", user.id).maybeSingle();
  return { uid: user.id, role: (prof?.role as string) || "student", shop: shop ? { id: shop.id as string, status: shop.status as string } : null };
}

// Yêu cầu là người bán đã duyệt (hoặc admin). Trả {uid, shopId} hoặc null.
export async function requireSeller(): Promise<{ uid: string; shopId: string; role: string } | null> {
  const c = await currentShop();
  if (!c) return null;
  if (c.shop && c.shop.status === "approved") return { uid: c.uid, shopId: c.shop.id, role: c.role };
  return null;
}

export async function getShopCategories() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("shop_categories").select("id, name, slug, fee_percent").order("position");
  return data ?? [];
}

function mapProduct(p: Record<string, unknown>): ShopProduct {
  const shop = p.shops as { name?: string; slug?: string; logo_url?: string } | undefined;
  const cat = p.shop_categories as { name?: string } | undefined;
  return {
    id: p.id as string, shop_id: p.shop_id as string, type: (p.type as string) || "digital", title: p.title as string, slug: p.slug as string,
    description: (p.description as string) || undefined, price: (p.price as number) || 0, compare_price: (p.compare_price as number) || undefined,
    category_id: (p.category_id as string) || undefined, stock: (p.stock as number) ?? null,
    media: Array.isArray(p.media) ? (p.media as string[]) : [], options: Array.isArray(p.options) ? (p.options as { name: string; values: string[] }[]) : [],
    digital_url: (p.digital_url as string) || undefined, digital_note: (p.digital_note as string) || undefined,
    shipping_fee: (p.shipping_fee as number) || 0, status: p.status as string, review_status: p.review_status as string,
    sold_count: (p.sold_count as number) || 0, rating: Number(p.rating) || 0, rating_count: (p.rating_count as number) || 0,
    variants: Array.isArray(p.variants) ? (p.variants as Variant[]) : [], sale_ends_at: (p.sale_ends_at as string) || null,
    views: (p.views as number) || 0, created_at: (p.created_at as string) || undefined,
    shop: shop ? { name: shop.name || "", slug: shop.slug || "", logo_url: shop.logo_url } : null, category: cat?.name || null,
  };
}

// Danh sách sản phẩm đã duyệt (cho trang /shop). categorySlug optional.
export async function getProducts(opts: { category?: string; q?: string; shopSlug?: string; type?: string; sort?: string } = {}): Promise<ShopProduct[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  let catId: string | null = null;
  if (opts.category) {
    const { data: c } = await admin.from("shop_categories").select("id").eq("slug", opts.category).maybeSingle();
    catId = (c?.id as string) || null;
    if (!catId) return [];
  }
  const sortMap: Record<string, { col: string; asc: boolean }> = {
    new: { col: "created_at", asc: false },
    price_asc: { col: "price", asc: true },
    price_desc: { col: "price", asc: false },
    best: { col: "sold_count", asc: false },
  };
  const srt = sortMap[opts.sort || "new"] || sortMap.new;
  let query = admin.from("shop_products")
    .select("*, shops!inner(name, slug, logo_url, status), shop_categories(name, slug)")
    .eq("status", "published").eq("review_status", "approved").eq("shops.status", "approved")
    .order(srt.col, { ascending: srt.asc }).limit(60);
  if (catId) query = query.eq("category_id", catId);
  if (opts.type === "digital" || opts.type === "physical") query = query.eq("type", opts.type);
  if (opts.q) { const kw = opts.q.replace(/[%,]/g, " ").trim(); if (kw) query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%`); }
  const { data } = await query;
  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<ShopProduct | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("shop_products").select("*, shops(name, slug, logo_url, status), shop_categories(name, slug)").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return mapProduct(data);
}

// Tăng lượt xem sản phẩm (fire-and-forget, atomic qua RPC)
export async function bumpProductView(id: string) {
  const admin = createAdminClient();
  if (admin) await admin.rpc("bump_product_view", { pid: id });
}

// ID sản phẩm user đã yêu thích (để đánh dấu ♥ trên thẻ). Trả Set rỗng nếu chưa đăng nhập.
export async function getFavoriteIds(): Promise<Set<string>> {
  const s = await createClient();
  if (!s) return new Set();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return new Set();
  const admin = createAdminClient();
  const { data } = await (admin ?? s).from("shop_favorites").select("product_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.product_id as string));
}

// Sản phẩm user đã yêu thích (đầy đủ) — cho trang /shop/favorites
export async function getFavoriteProducts(): Promise<ShopProduct[]> {
  const s = await createClient();
  if (!s) return [];
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: favs } = await admin.from("shop_favorites").select("product_id").eq("user_id", user.id);
  const ids = (favs ?? []).map((r) => r.product_id as string);
  if (!ids.length) return [];
  const { data } = await admin.from("shop_products").select("*, shops(name, slug, logo_url, status), shop_categories(name, slug)").in("id", ids);
  return (data ?? []).map(mapProduct);
}
