"use client";
import Link from "next/link";
import StudentCard from "@/components/StudentCard";

export interface DashData {
  name: string; studentCode: string; avatarUrl: string; joined: string; role: string;
  courses: { slug: string; title: string; thumb: string; pct: number }[];
  certs: number; totalCompleted: number;
}

export default function DashboardClient({ data }: { data: DashData }) {
  const { courses } = data;
  const cont = courses.find((c) => c.pct < 100) || courses[0];

  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-1">Xin chào, {data.name} 👋</h1>
      <p className="text-ink-2 mb-8">Tiếp tục hành trình học AI của bạn.</p>

      {/* Continue learning */}
      {cont ? (
        <div className="rounded-card border border-border bg-ink text-white p-6 sm:p-8 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div>
            <div className="text-white/60 text-sm mb-1">Tiếp tục học</div>
            <h2 className="text-2xl font-extrabold tracking-tight">{cont.title}</h2>
            <div className="mt-3 w-64 max-w-full h-2 bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${cont.pct}%` }} /></div>
            <div className="text-white/60 text-sm mt-1.5">{cont.pct}% hoàn thành</div>
          </div>
          <Link href={`/learn/${cont.slug}`} className="rounded-full bg-white text-ink hover:bg-neutral-100 font-semibold px-6 py-3 transition-colors">Học tiếp →</Link>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-bg-soft p-8 mb-10 text-center">
          <p className="text-ink-2 mb-3">Bạn chưa ghi danh khóa nào.</p>
          <Link href="/courses" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Khám phá khóa học</Link>
        </div>
      )}

      {/* Stats thật */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[["Khóa đã ghi danh", courses.length], ["Bài đã hoàn thành", data.totalCompleted], ["Chứng chỉ", data.certs], ["Vai trò", data.role]].map(([l, v]) => (
          <div key={l as string} className="rounded-card border border-border bg-surface p-5">
            <div className="text-2xl font-extrabold tracking-tight">{v}</div>
            <div className="text-ink-3 text-sm">{l}</div>
          </div>
        ))}
      </div>

      {/* Thẻ học viên — dữ liệu thật */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center rounded-card border border-border bg-bg-soft p-6 sm:p-8 mb-10">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight mb-2">Thẻ học viên của bạn</h2>
          <p className="text-ink-2 max-w-[44ch]">Thẻ định danh số tại VIE AI EDU — tự cập nhật theo hồ sơ của bạn. Mã học viên: <b className="font-mono text-ink">{data.studentCode}</b>.</p>
          <div className="flex gap-3 mt-4">
            <Link href="/account" className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 transition-colors">Cập nhật hồ sơ</Link>
          </div>
        </div>
        <div className="justify-self-center">
          <StudentCard name={data.name} studentId={data.studentCode} joined={data.joined} avatarUrl={data.avatarUrl} role={data.role} />
        </div>
      </div>

      {/* My courses */}
      <h2 className="text-xl font-extrabold tracking-tight mb-4">Khóa học của tôi</h2>
      {courses.length === 0 ? (
        <p className="text-ink-3">Chưa có khóa học. <Link href="/courses" className="text-accent font-semibold">Xem khóa học →</Link></p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.slug} href={`/learn/${c.slug}`} className="rounded-card border border-border bg-surface p-5 hover:border-border-strong hover:shadow-soft transition-all">
              <h3 className="font-bold mb-3">{c.title}</h3>
              <div className="h-2 bg-bg-soft rounded-full overflow-hidden"><div className="h-full bg-success" style={{ width: `${c.pct}%` }} /></div>
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-ink-2">{c.pct}%</span>
                <span className="text-accent font-semibold">{c.pct === 0 ? "Bắt đầu" : c.pct === 100 ? "Hoàn thành ✓" : "Tiếp tục"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
