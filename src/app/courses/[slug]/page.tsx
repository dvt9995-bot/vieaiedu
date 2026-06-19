import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COURSES, getCourse } from "@/lib/mock";
import { LEVEL_LABEL } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import CoursePurchase from "@/components/CoursePurchase";

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCourse(slug);
  if (!c) return { title: "Không tìm thấy khóa học" };
  return { title: c.title, description: c.subtitle };
}

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  // JSON-LD cho SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle,
    provider: { "@type": "Organization", name: "VIE AI EDU", sameAs: "https://vieaiedu.vn" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header band */}
      <section className="bg-ink text-white">
        <div className="container-x py-12">
          <div className="text-sm text-white/60 mb-3">
            <Link href="/courses" className="hover:text-white">Khóa học</Link> / {course.category}
          </div>
          <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight max-w-[20ch]">{course.title}</h1>
          <p className="text-white/70 text-lg mt-3 max-w-[60ch]">{course.subtitle}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm text-white/80">
            <span>⭐ <b className="text-white">{course.rating}</b> ({course.ratingCount} đánh giá)</span>
            <span>{course.students.toLocaleString("vi-VN")} học viên</span>
            <span>{LEVEL_LABEL[course.level]}</span>
            <span>{formatDuration(course.totalMinutes)} · {course.lessonsCount} bài</span>
            <span>Giảng viên: {course.instructor}</span>
          </div>
        </div>
      </section>

      <div className="container-x py-12 grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        {/* Left */}
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-4">Bạn sẽ học được gì</h2>
          <ul className="grid sm:grid-cols-2 gap-3 mb-12">
            {course.whatYouLearn.map((w) => (
              <li key={w} className="flex gap-2.5 items-start">
                <span className="flex-none w-5 h-5 rounded-full bg-accent-weak text-accent flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
                <span className="text-ink-2">{w}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-extrabold tracking-tight mb-1">Nội dung khóa học</h2>
          <p className="text-ink-3 text-sm mb-5">{course.sections.length} chương · {course.lessonsCount} bài · Bài có 👁 xem thử miễn phí</p>
          <div className="space-y-3">
            {course.sections.map((s) => (
              <div key={s.id} className="border border-border rounded-card overflow-hidden">
                <div className="bg-bg-soft px-5 py-3.5 font-bold border-b border-border">{s.title}</div>
                <ul>
                  {s.lessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-ink-3"><path d="M8 5v14l11-7z" /></svg>
                        <span className="text-ink-2">{l.title}</span>
                        {l.isPreview && (
                          <Link href={`/learn/${course.slug}?lesson=${l.id}`} className="text-xs font-semibold text-accent border border-accent-weak bg-accent-weak px-2 py-0.5 rounded-full">
                            👁 Xem thử
                          </Link>
                        )}
                      </div>
                      <span className="text-ink-3 text-sm">{fmtSec(l.durationSec)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight mt-12 mb-4">Mô tả</h2>
          <p className="text-ink-2 leading-relaxed">{course.description}</p>
        </div>

        {/* Right: purchase */}
        <CoursePurchase course={course} />
      </div>
    </>
  );
}
