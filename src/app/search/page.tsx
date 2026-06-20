import type { Metadata } from "next";
import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import { getCourses } from "@/lib/courses";
import { getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = { title: "Tìm kiếm" };
export const dynamic = "force-dynamic";

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = norm(q.trim());
  const [courses, blog] = query ? await Promise.all([getCourses(), getBlogPosts()]) : [[], []];

  const courseHits = query ? courses.filter((c) => norm(`${c.title} ${c.subtitle} ${c.category}`).includes(query)).slice(0, 9) : [];
  const blogHits = query ? blog.filter((b) => norm(`${b.title} ${b.excerpt}`).includes(query)).slice(0, 9) : [];
  const total = courseHits.length + blogHits.length;

  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mb-5">Tìm kiếm</h1>
      <form action="/search" method="GET" className="relative max-w-[560px] mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 stroke-ink-3 fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input name="q" defaultValue={q} autoFocus placeholder="Tìm khóa học, tin tức AI…" className="w-full pl-11 pr-4 py-3 rounded-full border border-border-strong bg-surface outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-weak)] transition" />
      </form>

      {!query ? (
        <p className="text-ink-3">Nhập từ khóa để tìm khóa học và tin tức.</p>
      ) : total === 0 ? (
        <p className="text-ink-3">Không tìm thấy kết quả cho “{q}”.</p>
      ) : (
        <div className="space-y-10">
          <p className="text-ink-3 text-sm">{total} kết quả cho “{q}”</p>
          {courseHits.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold tracking-tight mb-4">Khóa học ({courseHits.length})</h2>
              <div className="grid gap-[22px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {courseHits.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
            </section>
          )}
          {blogHits.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold tracking-tight mb-4">Tin tức ({blogHits.length})</h2>
              <div className="grid gap-5 md:grid-cols-3">
                {blogHits.map((b) => (
                  <Link key={b.slug} href={`/blog/${b.slug}`} className="block rounded-card border border-border bg-surface overflow-hidden hover:border-border-strong hover:shadow-soft transition-all">
                    <div className="aspect-video bg-bg-soft overflow-hidden">
                      {b.cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full grid place-items-center text-2xl">📰</div>}
                    </div>
                    <div className="p-4">
                      <div className="text-ink-3 text-xs mb-1">{b.date}</div>
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{b.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
