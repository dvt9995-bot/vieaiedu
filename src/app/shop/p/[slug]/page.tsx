import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getProducts, getFavoriteIds, bumpProductView, onSale, discountPct } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { mdToHtml } from "@/lib/md";
import { formatVND } from "@/lib/format";
import ProductBuy from "@/components/shop/ProductBuy";
import ProductQA from "@/components/shop/ProductQA";
import ProductCard from "@/components/shop/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Sản phẩm" };
  const url = `https://vieaiedu.vn/shop/p/${slug}`;
  const desc = (p.description?.replace(/[#*>\-`]/g, "").trim().slice(0, 160)) || `${p.title} — mua trên sàn VIE AI EDU.`;
  const img = p.media?.[0];
  return {
    title: `${p.title} — ${formatVND(p.price)}`, description: desc,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: p.title, description: desc, images: img ? [{ url: img }] : [] },
    twitter: { card: "summary_large_image", title: p.title, description: desc, images: img ? [img] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.review_status !== "approved" || p.status !== "published") notFound();
  bumpProductView(p.id).catch(() => {});
  const admin = createAdminClient();
  const [{ data: reviews }, related, favIds] = await Promise.all([
    admin ? admin.from("shop_reviews").select("rating, body, created_at, profiles(full_name, avatar_url)").eq("product_id", p.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    getProducts({ sort: "best" }).then((list) => list.filter((x) => x.id !== p.id && (!p.category || x.category === p.category)).slice(0, 4)),
    getFavoriteIds(),
  ]);
  const soldOut = p.type === "physical" && p.stock != null && p.stock <= 0;
  const sale = onSale(p);
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: p.title, image: p.media || [], description: (p.description || "").slice(0, 500), brand: { "@type": "Brand", name: p.shop?.name || "VIE AI EDU" }, offers: { "@type": "Offer", price: String(p.price), priceCurrency: "VND", availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", url: `https://vieaiedu.vn/shop/p/${slug}` }, ...(p.rating_count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: String(p.rating), reviewCount: String(p.rating_count) } } : {}) };

  return (
    <div className="container-x py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-ink-3 flex gap-1.5 flex-wrap"><Link href="/shop" className="hover:text-ink">Shop</Link>{p.category && <><span>/</span><Link href={`/shop?cat=`} className="hover:text-ink">{p.category}</Link></>}<span>/</span><span className="text-ink-2 truncate">{p.title}</span></nav>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-4 items-start">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3">
            {(p.media || []).slice(0, 6).map((m, i) => (
              <div key={i} className={`relative rounded-card overflow-hidden border border-border bg-bg-soft ${i === 0 ? "col-span-2 aspect-video" : "aspect-square"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m} alt={`${p.title} ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {p.description?.trim() && <div className="prose-course text-ink-2 leading-relaxed mt-6" dangerouslySetInnerHTML={{ __html: mdToHtml(p.description) }} />}

          {/* Đánh giá */}
          <section className="mt-8">
            <h2 className="text-xl font-extrabold tracking-tight mb-3">Đánh giá ({p.rating_count})</h2>
            {(reviews || []).length === 0 ? <p className="text-ink-3 text-sm">Chưa có đánh giá.</p> : (
              <div className="space-y-3">
                {(reviews || []).map((r, i) => { const pr = r.profiles as { full_name?: string; avatar_url?: string } | null; return (
                  <div key={i} className="rounded-card border border-border bg-surface p-4">
                    <div className="text-gold text-sm">{"★".repeat(Math.min(5, r.rating as number))}</div>
                    {r.body ? <p className="text-sm text-ink-2 mt-1">{r.body as string}</p> : null}
                    <div className="text-xs text-ink-3 mt-1.5">{pr?.full_name || "Học viên"}</div>
                  </div>
                ); })}
              </div>
            )}
          </section>

          <ProductQA productId={p.id} />
        </div>

        <aside className="lg:sticky lg:top-24 rounded-card border border-border bg-surface shadow-lg p-5 min-w-0">
          <span className="text-[11px] font-bold text-white bg-ink/70 rounded-full px-2 py-0.5">{p.type === "digital" ? "SẢN PHẨM SỐ — giao ngay" : "SẢN PHẨM VẬT LÝ"}</span>
          <h1 className="text-xl font-extrabold tracking-tight mt-2">{p.title}</h1>
          <div className="flex items-baseline gap-2 mt-2 mb-1 flex-wrap">
            <span className="text-2xl font-extrabold text-accent">{p.price > 0 ? formatVND(p.price) : "Miễn phí"}</span>
            {sale ? <><span className="text-ink-3 line-through text-sm">{formatVND(p.compare_price!)}</span><span className="text-[11px] font-black text-white bg-accent rounded-full px-2 py-0.5">-{discountPct(p)}%</span></> : null}
          </div>
          {sale && p.sale_ends_at ? <div className="text-[12px] text-warning font-semibold mb-2">⏰ Ưu đãi đến {new Date(p.sale_ends_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</div> : null}
          <div className="flex items-center gap-3 text-xs text-ink-3 mb-3">
            <span>Đã bán {p.sold_count}</span>
            {p.rating_count > 0 && <span className="text-gold">★ {p.rating}</span>}
            {p.type === "physical" && p.stock != null && <span>Còn {p.stock}</span>}
            <span>👁 {p.views || 0}</span>
          </div>
          <ProductBuy productId={p.id} type={p.type} price={p.price} options={p.options} variants={p.variants} soldOut={soldOut} favorited={favIds.has(p.id)} />
          <div className="mt-4 pt-4 border-t border-border text-xs text-ink-2 space-y-1.5">
            <div>🏪 Người bán: <b>{p.shop?.name}</b></div>
            <div>🛡️ Thanh toán an toàn — tiền được sàn giữ tới khi bạn nhận hàng/sản phẩm.</div>
            {p.type === "physical" && p.shipping_fee > 0 && <div>🚚 Phí vận chuyển: {formatVND(p.shipping_fee)}</div>}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight mb-4">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((r) => <ProductCard key={r.id} p={{ id: r.id, slug: r.slug, title: r.title, price: r.price, compare_price: onSale(r) ? r.compare_price : null, media: r.media, type: r.type, rating: r.rating, rating_count: r.rating_count, shop: r.shop, discount: onSale(r) ? discountPct(r) : 0, badge: r.sold_count >= 5 ? "🔥 Bán chạy" : null, favorited: favIds.has(r.id) }} />)}
          </div>
        </section>
      )}
    </div>
  );
}
