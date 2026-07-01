import type { Metadata } from "next";
import Link from "next/link";
import { getProducts, getShopCategories, getFavoriteIds, onSale, discountPct } from "@/lib/shop";
import { buttonClass } from "@/lib/button";
import ShopFilter from "@/components/shop/ShopFilter";
import ProductCard from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "Shop — Sản phẩm số & vật lý", description: "Mua sản phẩm số, công cụ AI, template và sản phẩm vật lý từ cộng đồng VIE AI EDU." };
export const dynamic = "force-dynamic";
const RECENT_MS = 14 * 86400000;

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; type?: string; sort?: string }> }) {
  const sp = await searchParams;
  const [products, cats, favIds] = await Promise.all([getProducts({ category: sp.cat, q: sp.q, type: sp.type, sort: sp.sort }), getShopCategories(), getFavoriteIds()]);

  return (
    <div className="container-x py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-semibold">🛍️ Shop</div>
          <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight mt-1">Chợ sản phẩm số &amp; vật lý</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/shop/favorites" className={buttonClass({ variant: "secondary" })}>❤️ Yêu thích</Link>
          <Link href="/shop/cart" className={buttonClass({ variant: "secondary" })}>🛒 Giỏ hàng</Link>
          <Link href="/seller" className={buttonClass({ variant: "primary" })}>Bán hàng cùng tôi</Link>
        </div>
      </div>

      {/* Tìm kiếm */}
      <form className="mt-5 flex gap-2" action="/shop">
        {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
        {sp.type && <input type="hidden" name="type" value={sp.type} />}
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        <input name="q" defaultValue={sp.q || ""} placeholder="🔍 Tìm sản phẩm…" className="flex-1 max-w-md px-4 py-2.5 rounded-full border border-border-strong bg-surface text-sm outline-none focus:border-accent" />
        <button className={buttonClass({ variant: "primary", size: "sm" })}>Tìm</button>
      </form>

      {/* Bộ lọc phễu (đồng bộ toàn app) */}
      <div className="flex items-center gap-2 flex-wrap mt-4">
        <ShopFilter cats={cats} cat={sp.cat} type={sp.type} sort={sp.sort} />
        <span className="text-sm text-ink-3">{products.length} sản phẩm{sp.q ? ` cho "${sp.q}"` : ""}</span>
      </div>

      {products.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-ink-3 mt-8">Không tìm thấy sản phẩm nào{sp.q ? ` cho "${sp.q}"` : sp.cat ? " trong danh mục này" : ""}.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {products.map((p) => {
            const isNew = p.created_at ? (Date.now() - new Date(p.created_at).getTime() < RECENT_MS) : false;
            const badge = p.sold_count >= 5 ? "🔥 Bán chạy" : isNew ? "Mới" : null;
            return <ProductCard key={p.id} p={{ id: p.id, slug: p.slug, title: p.title, price: p.price, compare_price: onSale(p) ? p.compare_price : null, media: p.media, type: p.type, rating: p.rating, rating_count: p.rating_count, shop: p.shop, discount: onSale(p) ? discountPct(p) : 0, badge, favorited: favIds.has(p.id) }} />;
          })}
        </div>
      )}
    </div>
  );
}
