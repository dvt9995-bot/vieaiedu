import type { Metadata } from "next";
import Link from "next/link";
import { getFavoriteProducts, onSale, discountPct } from "@/lib/shop";
import ProductCard from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "Sản phẩm yêu thích", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ShopFavoritesPage() {
  const products = await getFavoriteProducts();
  return (
    <div className="container-x py-12">
      <div className="text-xs uppercase tracking-wider text-accent font-semibold">🛍️ Shop</div>
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mt-1 mb-6">Sản phẩm yêu thích</h1>
      {products.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-ink-3">Bạn chưa lưu sản phẩm nào. <Link href="/shop" className="text-accent font-semibold">Khám phá Shop →</Link></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} p={{ id: p.id, slug: p.slug, title: p.title, price: p.price, compare_price: onSale(p) ? p.compare_price : null, media: p.media, type: p.type, rating: p.rating, rating_count: p.rating_count, shop: p.shop, discount: onSale(p) ? discountPct(p) : 0, badge: p.sold_count >= 5 ? "🔥 Bán chạy" : null, favorited: true }} />)}
        </div>
      )}
    </div>
  );
}
