"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { COURSES } from "@/lib/mock";
import StudentCard from "@/components/StudentCard";

// Mock: học viên đã ghi danh 3 khóa
const ENROLLED = ["prompt-engineering-thuc-chien", "nhap-mon-ai-mien-phi", "nhap-mon-tri-tue-nhan-tao"];

export default function DashboardClient() {
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const out: Record<string, number> = {};
    ENROLLED.forEach((slug) => {
      const course = COURSES.find((c) => c.slug === slug);
      if (!course) return;
      const total = course.sections.flatMap((s) => s.lessons).length;
      try {
        const p = JSON.parse(localStorage.getItem(`vieaiedu:progress:${slug}`) || "{}");
        const doneN = Array.isArray(p.done) ? p.done.length : 0;
        out[slug] = total ? Math.round((doneN / total) * 100) : 0;
      } catch { out[slug] = 0; }
    });
    setProgress(out);
  }, []);

  const enrolled = ENROLLED.map((s) => COURSES.find((c) => c.slug === s)!).filter(Boolean);
  const cont = enrolled[0];
  const contPct = progress[cont.slug] ?? 0;

  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-1">Xin chào 👋</h1>
      <p className="text-ink-2 mb-8">Tiếp tục hành trình học AI của bạn.</p>

      {/* Continue learning */}
      <div className="rounded-card border border-border bg-ink text-white p-6 sm:p-8 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
        <div>
          <div className="text-white/60 text-sm mb-1">Tiếp tục học</div>
          <h2 className="text-2xl font-extrabold tracking-tight">{cont.title}</h2>
          <div className="mt-3 w-64 max-w-full h-2 bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${contPct}%` }} /></div>
          <div className="text-white/60 text-sm mt-1.5">{contPct}% hoàn thành</div>
        </div>
        <Link href={`/learn/${cont.slug}`} className="rounded-full bg-white text-ink hover:bg-neutral-100 font-semibold px-6 py-3 transition-colors">Học tiếp →</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[["Khóa đã ghi danh", enrolled.length], ["Giờ đã học", 12], ["Chứng chỉ", 1], ["Streak", "5 ngày"]].map(([l, v]) => (
          <div key={l as string} className="rounded-card border border-border bg-surface p-5">
            <div className="text-2xl font-extrabold tracking-tight">{v}</div>
            <div className="text-ink-3 text-sm">{l}</div>
          </div>
        ))}
      </div>

      {/* Thẻ học viên */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center rounded-card border border-border bg-bg-soft p-6 sm:p-8 mb-10">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-2">Thẻ học viên của bạn</h2>
          <p className="text-ink-2 max-w-[44ch]">Thẻ định danh số tại VIE AI EDU — dùng để nhận diện học viên, tham gia sự kiện và xác thực thành tích học tập.</p>
          <div className="flex gap-3 mt-4">
            <button className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer transition-colors">⬇ Tải thẻ</button>
            <button className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold text-sm px-5 py-2.5 cursor-pointer transition-colors">Thêm vào ví</button>
          </div>
        </div>
        <div className="justify-self-center"><StudentCard /></div>
      </div>

      {/* My courses */}
      <h2 className="text-xl font-extrabold tracking-tight mb-4">Khóa học của tôi</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrolled.map((c) => {
          const pct = progress[c.slug] ?? 0;
          return (
            <Link key={c.id} href={`/learn/${c.slug}`} className="rounded-card border border-border bg-surface p-5 hover:border-border-strong hover:shadow-soft transition-all">
              <h3 className="font-bold mb-1">{c.title}</h3>
              <div className="text-ink-3 text-sm mb-3">{c.lessonsCount} bài</div>
              <div className="h-2 bg-bg-soft rounded-full overflow-hidden"><div className="h-full bg-success" style={{ width: `${pct}%` }} /></div>
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-ink-2">{pct}%</span>
                <span className="text-accent font-semibold">{pct === 0 ? "Bắt đầu" : pct === 100 ? "Hoàn thành ✓" : "Tiếp tục"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
