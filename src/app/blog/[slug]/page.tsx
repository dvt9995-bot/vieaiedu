import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getRelatedPosts } from "@/lib/blog";
import { mdToHtml } from "@/lib/md";
import ShareButtons from "@/components/ShareButtons";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBlogPostBySlug(slug);
  if (!b) return { title: "Không tìm thấy bài viết" };
  return { title: b.title, description: b.excerpt, openGraph: { title: b.title, description: b.excerpt, images: b.cover ? [b.cover] : undefined } };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBlogPostBySlug(slug);
  if (!b) notFound();
  const related = await getRelatedPosts(slug, 3);
  const gallery = (b.images || []).slice(1); // ảnh phụ (bỏ ảnh bìa)

  return (
    <article className="container-x py-12 max-w-[720px]">
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
      <div className="prose-vie text-ink-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(b.body) }} />

      {/* Thư viện ảnh từ nguồn */}
      {gallery.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">Hình ảnh từ bài gốc</h2>
          <div className="grid grid-cols-2 gap-3">
            {gallery.map((img, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} src={img} alt={`${b.title} ${i + 1}`} loading="lazy" className="w-full rounded-lg border border-border object-cover aspect-video" />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border flex-wrap">
        <span className="text-ink-3 text-sm">Thấy hữu ích? Chia sẻ cho mọi người:</span>
        <ShareButtons path={`/blog/${b.slug}`} />
      </div>

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
