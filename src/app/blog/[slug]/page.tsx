import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/blog";
import { mdToHtml } from "@/lib/md";

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
      <div className="mt-12 p-6 rounded-card bg-bg-soft border border-border text-center">
        <p className="font-semibold mb-3">Sẵn sàng học bài bản hơn?</p>
        <Link href="/courses" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Xem khóa học AI</Link>
      </div>
    </article>
  );
}
