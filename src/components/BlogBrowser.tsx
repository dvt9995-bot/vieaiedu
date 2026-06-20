"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

export interface BlogItem { slug: string; title: string; excerpt: string; date: string; cover?: string; sourceName?: string; }

export default function BlogBrowser({ posts }: { posts: BlogItem[] }) {
  const sources = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => set.add(p.sourceName || "VIE AI EDU"));
    return ["Tất cả", ...Array.from(set)];
  }, [posts]);
  const [src, setSrc] = useState("Tất cả");

  const filtered = posts.filter((p) => src === "Tất cả" || (p.sourceName || "VIE AI EDU") === src);
  const [featured, ...rest] = filtered;

  return (
    <>
      {/* Lọc nguồn */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-7 -mx-1 px-1">
        {sources.map((s) => (
          <button key={s} onClick={() => setSrc(s)} className={`shrink-0 text-sm rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${src === s ? "bg-accent text-white border-accent" : "bg-surface border-border-strong hover:border-accent"}`}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-3 py-10 text-center">Chưa có bài viết.</p>
      ) : (
        <>
          {/* Bài nổi bật */}
          {featured && (
            <Link href={`/blog/${featured.slug}`} className="grid md:grid-cols-2 gap-6 rounded-card border border-border bg-surface overflow-hidden mb-8 hover:border-border-strong hover:shadow-soft transition-all group">
              <div className="aspect-video md:aspect-auto bg-bg-soft overflow-hidden">
                {featured.cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={featured.cover} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                ) : <div className="w-full h-full grid place-items-center text-5xl">📰</div>}
              </div>
              <div className="p-6 flex flex-col justify-center">
                <div className="text-accent text-xs font-bold uppercase tracking-wider mb-2">Nổi bật{featured.sourceName ? ` · ${featured.sourceName}` : ""}</div>
                <h2 className="text-2xl font-extrabold tracking-tight leading-tight mb-2">{featured.title}</h2>
                <p className="text-ink-2 line-clamp-3">{featured.excerpt}</p>
                <div className="text-ink-3 text-sm mt-3">{featured.date}</div>
              </div>
            </Link>
          )}

          {/* Lưới còn lại */}
          <div className="grid gap-6 md:grid-cols-3">
            {rest.map((b) => (
              <Link key={b.slug} href={`/blog/${b.slug}`} className="block rounded-card border border-border bg-surface overflow-hidden transition-all hover:border-border-strong hover:shadow-soft hover:-translate-y-1">
                <div className="aspect-video bg-bg-soft overflow-hidden">
                  {b.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full grid place-items-center text-3xl">📰</div>}
                </div>
                <div className="p-5">
                  <div className="text-ink-3 text-xs mb-2">{b.date}{b.sourceName ? ` · ${b.sourceName}` : ""}</div>
                  <h3 className="text-lg font-bold tracking-tight mb-2 line-clamp-2">{b.title}</h3>
                  <p className="text-ink-2 text-sm line-clamp-3">{b.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
