"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVND } from "@/lib/format";
import { useAuthModal } from "@/components/AuthModal";

export interface CardProduct {
  id: string; slug: string; title: string; price: number; compare_price?: number | null;
  media?: string[]; type: string; rating: number; rating_count: number;
  shop?: { name: string } | null; discount?: number; badge?: string | null; favorited?: boolean;
}

export default function ProductCard({ p }: { p: CardProduct }) {
  const router = useRouter();
  const { open } = useAuthModal();
  const [fav, setFav] = useState(!!p.favorited);
  const [busy, setBusy] = useState(false);

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (busy) return; setBusy(true);
    const r = await fetch("/api/shop/favorite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: p.id }) });
    setBusy(false);
    if (r.status === 401) return open("register");
    if (r.ok) { const d = await r.json(); setFav(!!d.favorited); router.refresh(); }
  }

  return (
    <Link href={`/shop/p/${p.slug}`} className="rounded-card border border-border bg-surface overflow-hidden hover:shadow-lg transition-shadow group relative">
      <div className="relative aspect-square bg-bg-soft overflow-hidden">
        {p.media?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.media[0]} alt={p.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />}
        <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-ink/70 rounded-full px-2 py-0.5">{p.type === "digital" ? "SỐ" : "VẬT LÝ"}</span>
        {p.discount ? <span className="absolute top-2 right-9 text-[10px] font-black text-white bg-accent rounded-full px-2 py-0.5">-{p.discount}%</span> : null}
        <button onClick={toggleFav} aria-label="Yêu thích" className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-white/85 backdrop-blur text-base cursor-pointer hover:scale-110 transition-transform">{fav ? "❤️" : "🤍"}</button>
        {p.badge ? <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-gold/90 rounded-full px-2 py-0.5">{p.badge}</span> : null}
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
  );
}
