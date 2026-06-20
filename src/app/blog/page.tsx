import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import BlogBrowser from "@/components/BlogBrowser";

export const metadata: Metadata = {
  title: "Tin tức & kiến thức AI",
  description: "Tin tức AI nổi bật, hướng dẫn và kinh nghiệm — cập nhật hằng ngày bởi VIE AI EDU.",
};

export const revalidate = 600;

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Tin tức &amp; Blog AI</h1>
      <p className="text-ink-2 text-lg mb-8 max-w-[60ch]">Tin AI nổi bật mỗi ngày, hướng dẫn và kinh nghiệm thực chiến.</p>
      <BlogBrowser posts={posts.map((b) => ({ slug: b.slug, title: b.title, excerpt: b.excerpt, date: b.date, cover: b.cover, sourceName: b.sourceName }))} />
    </div>
  );
}
