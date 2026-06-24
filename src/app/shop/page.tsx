import type { Metadata } from "next";
import Link from "next/link";
import { getProducts, getShopCategories } from "@/lib/shop";
import { formatVND } from "@/lib/format";

export const metadata: Metadata = { title: "Shop — Sản phẩm số & vật lý", description: "Mua sản phẩm số, công cụ AI, template và sản phẩm vật lý từ cộng đồng VIE AI EDU." };
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const sp = await searchParams;
  const [products, cats] = await Promise.all([getProducts({ category: sp.cat, q: sp.q }), getShopCategories()]);

  return (
    <div className="container-x py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-semibold">🛍️ Shop</div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Chợ sản phẩm số &amp; vật lý</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/shop/cart" className="rounded-full border border-border-strong hover:border-accent text-sm font-semibold px-4 py-2">🛒 Giỏ hàng</Link>
          <Link href="/seller" className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2">Bán hàng cùng tôi</Link>
        </div>
      </div>

      {/* Danh mục */}
      <div className="flex gap-2 flex-wrap mt-5">
        <Link href="/shop" className={`text-sm font-semibold rounded-full px-3.5 py-1.5 border ${!sp.cat ? "border-accent bg-accent-weak text-accent" : "border-border text-ink-2"}`}>Tất cả</Link>
        {cats.map((c) => (
          <Link key={c.id} href={`/shop?cat=${c.slug}`} className={`text-sm font-semibold rounded-full px-3.5 py-1.5 border ${sp.cat === c.slug ? "border-accent bg-accent-weak text-accent" : "border-border text-ink-2"}`}>{c.name}</Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-ink-3 mt-8">Chưa có sản phẩm nào{sp.cat ? " trong danh mục này" : ""}.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {products.map((p) => (
            <Link key={p.id} href={`/shop/p/${p.slug}`} className="rounded-card border border-border bg-surface overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative aspect-square bg-bg-soft overflow-hidden">
                {p.media?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.media[0]} alt={p.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-ink/70 rounded-full px-2 py-0.5">{p.type === "digital" ? "SỐ" : "VẬT LÝ"}</span>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm leading-snug line-clamp-2">{p.title}</h3>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="font-extrabold text-accent">{p.price > 0 ? formatVND(p.price) : "Miễn phí"}</span>
                  {p.compare_price && p.compare_price > p.price ? <span className="text-[11px] text-ink-3 line-through">{formatVND(p.compare_price)}</span> : null}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-ink-3">
                  <span className="truncate">{p.shop?.name}</span>
                  {p.rating_count > 0 && <span className="text-gold shrink-0">★ {p.rating} ({p.rating_count})</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
