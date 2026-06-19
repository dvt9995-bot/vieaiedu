import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG, getBlog } from "@/lib/mock";

export function generateStaticParams() {
  return BLOG.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = getBlog(slug);
  if (!b) return { title: "Không tìm thấy bài viết" };
  return { title: b.title, description: b.excerpt };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = getBlog(slug);
  if (!b) notFound();
  return (
    <article className="container-x py-12 max-w-[720px]">
      <Link href="/blog" className="text-ink-3 text-sm hover:text-ink">← Tất cả bài viết</Link>
      <div className="text-ink-3 text-sm mt-6 mb-3">{b.date} · {b.readMin} phút đọc</div>
      <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold tracking-tight leading-tight">{b.title}</h1>
      <p className="text-ink-2 text-lg mt-4">{b.excerpt}</p>
      <div className="aspect-video bg-bg-soft border border-border rounded-card my-8 flex items-center justify-center text-ink-3 text-sm">Ảnh minh họa</div>
      <div className="prose text-ink-2 leading-relaxed space-y-4">
        <p>{b.body}</p>
        <p>Đây là nội dung mẫu của bài viết. Khi nối Supabase, nội dung markdown sẽ được lấy từ bảng <code>blog_posts</code> và render đầy đủ.</p>
      </div>
      <div className="mt-12 p-6 rounded-card bg-bg-soft border border-border text-center">
        <p className="font-semibold mb-3">Sẵn sàng học bài bản hơn?</p>
        <Link href="/courses" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Xem khóa học AI</Link>
      </div>
    </article>
  );
}
