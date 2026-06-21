import Link from "next/link";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import CourseCard from "@/components/CourseCard";
import Avatar from "@/components/Avatar";
import { formatDate } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import { getCourses } from "@/lib/courses";
import { syncCoursesSocial } from "@/lib/course-social";
import { getBlogPosts } from "@/lib/blog";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: "/" } };

const BASE = "https://vieaiedu.vn";
const orgLd = {
  "@context": "https://schema.org", "@type": "Organization",
  name: "VIE AI EDU", url: BASE, logo: `${BASE}/logo.png`,
  description: "Cộng đồng & nền tảng học AI dành cho người Việt.",
  slogan: "Kiến tạo tri thức – Dẫn lối tương lai",
};
const siteLd = {
  "@context": "https://schema.org", "@type": "WebSite",
  name: "VIE AI EDU", url: BASE,
  potentialAction: { "@type": "SearchAction", target: `${BASE}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
};

interface FeedPost { id: string; body: string; author_name: string; author_id: string; author_avatar: string | null; likes: number; comments: number; created_at: string; image_url: string | null; }

async function featuredPosts(): Promise<FeedPost[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase!.rpc("community_feed", { lim: 50 });
  return ((data as FeedPost[]) || []).sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments)).slice(0, 4);
}

export default async function Home() {
  const [courses, posts, blog] = await Promise.all([getCourses(), featuredPosts(), getBlogPosts()]);
  await syncCoursesSocial(courses); // like YouTube + thời lượng (live) cho thẻ
  const free = courses.filter((c) => c.price === 0).slice(0, 8);
  const freeList = free.length ? free : courses.slice(0, 8);
  const news = blog.slice(0, 6);

  return (
    <>
      <JsonLd data={[orgLd, siteLd]} />
      <Hero />

      {/* Khóa học miễn phí */}
      <section className="py-10 md:py-16 border-b border-border">
        <div className="container-x">
          <div className="flex items-end justify-between mb-7">
            <div>
              <div className="text-accent text-xs font-bold uppercase tracking-wider mb-1">Học miễn phí</div>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold tracking-tight">Khóa học mở cho mọi người</h2>
            </div>
            <Link href="/courses" className="text-sm font-semibold text-ink-2 hover:text-accent shrink-0">Tất cả →</Link>
          </div>
          {/* Mobile: 2 hàng cuộn ngang · Desktop: lưới 3 cột */}
          <div className="grid gap-4 grid-flow-col grid-rows-2 auto-cols-[47%] scroll-x snap-x snap-mandatory pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:gap-5 md:grid-flow-row md:grid-rows-none md:auto-cols-auto md:grid-cols-3 md:overflow-visible">
            {freeList.map((c) => (<div key={c.id} className="snap-start"><CourseCard course={c} /></div>))}
          </div>
        </div>
      </section>

      {/* Tin tức AI mới nhất */}
      <section className="py-10 md:py-16 bg-bg-soft border-b border-border">
        <div className="container-x">
          <div className="flex items-end justify-between mb-7">
            <div>
              <div className="text-accent text-xs font-bold uppercase tracking-wider mb-1">Cập nhật mỗi ngày</div>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold tracking-tight">Tin tức AI mới nhất</h2>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-ink-2 hover:text-accent shrink-0">Tất cả →</Link>
          </div>
          {news.length === 0 ? (
            <p className="text-ink-3">Sắp có tin tức mới…</p>
          ) : (
            <div className="grid gap-4 grid-flow-col grid-rows-3 auto-cols-[47%] scroll-x snap-x snap-mandatory pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:gap-5 md:grid-flow-row md:grid-rows-none md:auto-cols-auto md:grid-cols-3 md:overflow-visible">
              {news.map((b) => (
                <Link key={b.slug} href={`/blog/${b.slug}`} className="snap-start flex flex-col rounded-card border border-border bg-surface overflow-hidden h-full transition-all hover:border-border-strong hover:shadow-soft md:hover:-translate-y-1">
                  <div className="aspect-video bg-bg-soft overflow-hidden">
                    {b.cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full grid place-items-center text-ink-3">📰</div>}
                  </div>
                  <div className="p-3 md:p-4 min-w-0 flex-1">
                    <div className="text-ink-3 text-[.68rem] md:text-xs mb-1 line-clamp-1">{b.date}{b.sourceName ? ` · ${b.sourceName}` : ""}</div>
                    <h3 className="font-bold text-[.82rem] md:text-base leading-snug line-clamp-3 md:line-clamp-2">{b.title}</h3>
                    <p className="text-ink-2 text-sm mt-1.5 line-clamp-2 hidden md:block">{b.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cộng đồng nổi bật */}
      <section className="py-10 md:py-16 border-b border-border">
        <div className="container-x">
          <div className="flex items-end justify-between mb-7">
            <div>
              <div className="text-accent text-xs font-bold uppercase tracking-wider mb-1">Bảng tin cộng đồng</div>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold tracking-tight">Chia sẻ nổi bật</h2>
            </div>
            <Link href="/community" className="text-sm font-semibold text-ink-2 hover:text-accent shrink-0">Vào cộng đồng →</Link>
          </div>
          {posts.length === 0 ? (
            <div className="rounded-card border border-border bg-bg-soft p-8 text-center">
              <p className="text-ink-2 mb-3">Hãy là người đầu tiên chia sẻ trong cộng đồng!</p>
              <Link href="/community" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-5 py-2.5 transition-colors">Đăng bài đầu tiên</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <div className="rounded-card border border-border bg-surface p-5 h-full flex flex-col">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Link href={`/u/${p.author_id}`}><Avatar src={p.author_avatar} name={p.author_name || "H"} size={36} /></Link>
                      <div>
                        <Link href={`/u/${p.author_id}`} className="text-sm font-semibold hover:text-accent">{p.author_name || "Học viên"}</Link>
                        <div className="text-ink-3 text-xs">{formatDate(p.created_at)}</div>
                      </div>
                    </div>
                    <p className="text-[.95rem] text-ink-2 line-clamp-3 flex-1">{p.body}</p>
                    <div className="flex gap-5 mt-3 pt-3 border-t border-border text-ink-3 text-sm font-medium">
                      <span>♥ {p.likes}</span><span>💬 {p.comments}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA cộng đồng (không bán hàng) */}
      <section className="py-10 md:py-16">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink text-white text-center px-8 py-14">
              <svg className="absolute -right-20 top-1/2 -translate-y-1/2 w-[360px] opacity-[.06]" viewBox="0 0 200 200"><g fill="none" stroke="#fff" strokeWidth="1"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="62" /><circle cx="100" cy="100" r="32" /></g></svg>
              <h2 className="text-[clamp(1.6rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-white">Cùng nhau học &amp; chia sẻ về AI</h2>
              <p className="text-white/70 max-w-[48ch] mx-auto mt-3 mb-7">Tham gia miễn phí — đặt câu hỏi, chia sẻ dự án, cập nhật tin tức và kết nối với cộng đồng AI Việt.</p>
              <Link href="/community" className="inline-flex rounded-full bg-white text-ink hover:bg-neutral-100 font-semibold px-7 py-3 transition-colors">Tham gia cộng đồng</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
