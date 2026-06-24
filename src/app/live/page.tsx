import type { Metadata } from "next";
import Link from "next/link";
import { getLiveCourses, getMyLiveCourses } from "@/lib/live";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatVND } from "@/lib/format";
import JoinLiveButton from "@/components/live/JoinLiveButton";

export const metadata: Metadata = { title: "Lớp học trực tiếp", description: "Các lớp học trực tiếp qua Google Meet — tương tác trực tiếp với giảng viên." };
export const dynamic = "force-dynamic";

function nextSession(sessions: { starts_at: string }[]) {
  const up = sessions.filter((s) => new Date(s.starts_at).getTime() > Date.now()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return up[0];
}

export default async function LivePage() {
  const courses = await getLiveCourses();
  const user = await getCurrentUser();
  const mine = user ? await getMyLiveCourses(user.id) : [];
  const myUpcoming = mine.flatMap((c) => c.sessions.map((s) => ({ c, s }))).filter((x) => new Date(x.s.starts_at).getTime() > Date.now() - 6 * 3600 * 1000).sort((a, b) => +new Date(a.s.starts_at) - +new Date(b.s.starts_at));

  return (
    <div className="container-x py-12">
      <div className="text-xs uppercase tracking-wider text-accent font-semibold">🔴 Trực tiếp qua Google Meet</div>
      <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight mt-1">Lớp học trực tiếp</h1>
      <p className="text-ink-2 mt-2 max-w-2xl">Học trực tiếp, tương tác thời gian thực với giảng viên qua Google Meet. Đăng ký trên app — đến giờ bấm “Vào lớp”, hệ thống tự nhắc lịch.</p>

      {/* Lịch học của tôi */}
      {myUpcoming.length > 0 && (
        <div className="rounded-card border border-accent/30 bg-accent-weak/40 p-5 mt-6">
          <h2 className="font-bold text-lg mb-2">📅 Lịch học của tôi</h2>
          {myUpcoming.slice(0, 6).map(({ c, s }) => (
            <div key={s.id} className="flex items-center gap-2">
              <Link href={`/live/${c.slug}`} className="text-xs text-ink-3 hover:text-accent shrink-0 w-28 truncate hidden sm:block">{c.title}</Link>
              <div className="flex-1"><JoinLiveButton sessionId={s.id} title={s.title || c.title} startsAt={s.starts_at} durationMin={s.duration_min} enrolled recordingUrl={s.recording_url} /></div>
            </div>
          ))}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-ink-3 mt-8">Chưa có lớp trực tiếp nào. Hãy quay lại sau nhé!</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {courses.map((c) => {
            const ns = nextSession(c.sessions);
            const seatsLeft = c.capacity ? Math.max(0, c.capacity - (c.registered || 0)) : null;
            return (
              <Link key={c.slug} href={`/live/${c.slug}`} className="rounded-card border border-border bg-surface overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative aspect-video bg-bg-soft overflow-hidden">
                  {c.thumb && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.thumb} alt={c.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                  <span className="absolute top-2 left-2 text-[11px] font-bold text-white bg-accent rounded-full px-2 py-0.5">🔴 LIVE</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold leading-snug line-clamp-2">{c.title}</h3>
                  {c.subtitle && <p className="text-sm text-ink-3 mt-1 line-clamp-2">{c.subtitle}</p>}
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="font-extrabold text-accent">{c.price > 0 ? formatVND(c.price) : "Miễn phí"}</span>
                    <span className="text-xs text-ink-3">{c.sessions.length} buổi{seatsLeft !== null ? ` · còn ${seatsLeft}` : ""}</span>
                  </div>
                  {ns && <p className="text-xs text-ink-3 mt-1.5">Khai giảng: {new Date(ns.starts_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
