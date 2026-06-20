import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getRelatedPosts } from "@/lib/blog";
import { mdToHtml } from "@/lib/md";
import ShareButtons from "@/components/ShareButtons";
import JsonLd from "@/components/JsonLd";
import BlogEngagement from "@/components/BlogEngagement";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBlogPostBySlug(slug);
  if (!b) return { title: "Không tìm thấy bài viết" };
  return {
    title: b.title, description: b.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: "article", title: b.title, description: b.excerpt, images: b.cover ? [b.cover] : undefined },
  };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBlogPostBySlug(slug);
  if (!b) notFound();
  const related = await getRelatedPosts(slug, 3);
  const gallery = (b.images || []).slice(1); // ảnh phụ (bỏ ảnh bìa)

  const articleLd = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: b.title, description: b.excerpt,
    image: b.cover ? [b.cover] : undefined,
    datePublished: b.date, inLanguage: "vi-VN",
    mainEntityOfPage: `https://vieaiedu.vn/blog/${b.slug}`,
    author: { "@type": "Organization", name: b.sourceName ? `VIE AI EDU (nguồn: ${b.sourceName})` : "VIE AI EDU" },
    publisher: { "@type": "Organization", name: "VIE AI EDU", logo: { "@type": "ImageObject", url: "https://vieaiedu.vn/logo.png" } },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://vieaiedu.vn" },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: "https://vieaiedu.vn/blog" },
      { "@type": "ListItem", position: 3, name: b.title, item: `https://vieaiedu.vn/blog/${b.slug}` },
    ],
  };

  return (
    <article className="container-x py-12 max-w-[720px]">
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <Link href="/blog" className="text-ink-3 text-sm hover:text-ink">← Tất cả bài viết</Link>
      <div className="text-ink-3 text-sm mt-6 mb-3">{b.date} · {b.readMin} phút đọc{b.sourceName && ` · ${b.sourceName}`}</div>
      <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold tracking-tight leading-tight">{b.title}</h1>
      <p className="text-ink-2 text-lg mt-4">{b.excerpt}</p>
      {b.cover ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={b.cover} alt={b.title} className="w-full rounded-card my-8 border border-border" />
      ) : (
        <div className="aspect-video bg-bg-soft border border-border rounded-card my-8" />
      )}
      {/* Thân bài: ảnh nguồn được chèn xen kẽ đúng mạch nội dung */}
      <div className="prose-vie text-ink-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(b.body, gallery) }} />

      <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border flex-wrap">
        <span className="text-ink-3 text-sm">Thấy hữu ích? Chia sẻ cho mọi người:</span>
        <ShareButtons path={`/blog/${b.slug}`} />
      </div>

      {/* Thích + bình luận */}
      {b.id && <BlogEngagement postId={b.id} />}

      {/* Tin liên quan */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight mb-4">Tin liên quan</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="block rounded-card border border-border bg-surface overflow-hidden hover:border-border-strong hover:shadow-soft transition-all">
                <div className="aspect-video bg-bg-soft overflow-hidden">
                  {r.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.cover} alt={r.title} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full grid place-items-center text-2xl">📰</div>}
                </div>
                <div className="p-3">
                  <div className="text-ink-3 text-xs mb-1">{r.date}</div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 p-6 rounded-card bg-bg-soft border border-border text-center">
        <p className="font-semibold mb-3">Sẵn sàng học bài bản hơn?</p>
        <Link href="/courses" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Xem khóa học AI</Link>
      </div>
    </article>
  );
}
