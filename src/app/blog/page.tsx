import type { Metadata } from "next";
import Link from "next/link";
import { BLOG } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Blog — Kiến thức AI miễn phí",
  description: "Bài viết, hướng dẫn và lộ trình học AI miễn phí từ VIE AI EDU.",
};

export default function BlogPage() {
  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Blog</h1>
      <p className="text-ink-2 text-lg mb-10 max-w-[60ch]">Kiến thức AI miễn phí: hướng dẫn, mẹo và lộ trình học.</p>
      <div className="grid gap-6 md:grid-cols-3">
        {BLOG.map((b) => (
          <Link key={b.slug} href={`/blog/${b.slug}`} className="block rounded-card border border-border bg-surface overflow-hidden transition-all hover:border-border-strong hover:shadow-soft hover:-translate-y-1">
            <div className="aspect-video bg-bg-soft border-b border-border flex items-center justify-center">
              <svg className="w-full h-full opacity-50" viewBox="0 0 200 120"><g fill="none" stroke="#0b0c0e" strokeOpacity=".06" strokeWidth="1"><circle cx="100" cy="60" r="46" /><circle cx="100" cy="60" r="28" /></g></svg>
            </div>
            <div className="p-5">
              <div className="text-ink-3 text-xs mb-2">{b.date} · {b.readMin} phút đọc</div>
              <h2 className="text-lg font-bold tracking-tight mb-2">{b.title}</h2>
              <p className="text-ink-2 text-sm">{b.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
