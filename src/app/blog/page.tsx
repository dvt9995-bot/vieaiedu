import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import BlogBrowser from "@/components/BlogBrowser";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Tin tức & kiến thức AI",
  description: "Tin tức AI nổi bật, hướng dẫn và kinh nghiệm — cập nhật hằng ngày bởi VIE AI EDU.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 600;
const PER_PAGE = 12;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const all = await getBlogPosts();
  const cur = Math.max(1, parseInt(page || "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const posts = all.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const itemList = {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: posts.map((b, i) => ({ "@type": "ListItem", position: (cur - 1) * PER_PAGE + i + 1, url: `https://vieaiedu.vn/blog/${b.slug}`, name: b.title })),
  };

  return (
    <div className="container-x py-12">
      <JsonLd data={itemList} />
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Tin tức &amp; Blog AI</h1>
      <p className="text-ink-2 text-lg mb-8 max-w-[60ch]">Tin AI nổi bật mỗi ngày, hướng dẫn và kinh nghiệm thực chiến.</p>

      <BlogBrowser posts={posts.map((b) => ({ slug: b.slug, title: b.title, excerpt: b.excerpt, date: b.date, cover: b.cover, sourceName: b.sourceName }))} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Phân trang">
          {cur > 1 && <Link href={`/blog?page=${cur - 1}`} className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent">← Trước</Link>}
          {Array.from({ length: totalPages }).map((_, i) => (
            <Link key={i} href={`/blog?page=${i + 1}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${cur === i + 1 ? "bg-accent text-white" : "border border-border-strong hover:border-accent"}`}>{i + 1}</Link>
          ))}
          {cur < totalPages && <Link href={`/blog?page=${cur + 1}`} className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent">Sau →</Link>}
        </nav>
      )}
    </div>
  );
}
