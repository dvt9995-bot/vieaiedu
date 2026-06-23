import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLiveCourseBySlug } from "@/lib/live";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mdToHtml } from "@/lib/md";
import LiveRegister from "@/components/live/LiveRegister";
import JoinLiveButton from "@/components/live/JoinLiveButton";
import AnimatedProse from "@/components/live/AnimatedProse";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getLiveCourseBySlug(slug);
  if (!c) return { title: "Lớp học trực tiếp" };
  return { title: `${c.title} — Lớp trực tiếp`, description: c.subtitle || c.description?.slice(0, 150), openGraph: { images: c.thumb ? [c.thumb] : [] } };
}

export default async function LiveCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getLiveCourseBySlug(slug);
  if (!c) notFound();

  let enrolled = false;
  const user = await getCurrentUser();
  if (user) {
    const admin = createAdminClient();
    if (admin) { const { data } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle(); enrolled = !!data; }
  }
  const upcoming = c.sessions.filter((s) => new Date(s.starts_at).getTime() > Date.now() - 6 * 3600 * 1000);
  const soldOut = !!c.capacity && (c.registered || 0) >= c.capacity;
  const seatsLeft = c.capacity ? Math.max(0, c.capacity - (c.registered || 0)) : null;

  return (
    <div className="container-x py-8">
      <Link href="/live" className="text-sm text-ink-3 hover:text-ink">← Lớp học trực tiếp</Link>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-4 items-start">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent-weak rounded-full px-3 py-1">🔴 LỚP TRỰC TIẾP qua Google Meet</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">{c.title}</h1>
          {c.subtitle && <p className="text-lg text-ink-2 mt-2">{c.subtitle}</p>}
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-ink-3">
            {c.instructor && <span>Giảng viên: <b className="text-ink-2">{c.instructor}</b></span>}
            <span>📅 {c.sessions.length} buổi</span>
            {c.level && <span>🎯 {c.level}</span>}
            {seatsLeft !== null && <span className={seatsLeft <= 5 ? "text-accent font-semibold" : ""}>💺 còn {seatsLeft} chỗ</span>}
          </div>

          {c.thumb && (
            <div className="relative aspect-video rounded-card overflow-hidden border border-border mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumb} alt={c.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          {c.description?.trim() && <div className="mt-6"><AnimatedProse html={mdToHtml(c.description)} /></div>}

          {/* Lịch học */}
          <div className="rounded-card border border-border bg-surface p-5 mt-6">
            <h2 className="font-bold text-lg mb-1">Lịch học</h2>
            <p className="text-ink-3 text-xs mb-3">{enrolled ? "Bấm “Vào lớp ngay” khi đến giờ (mở 15 phút trước)." : "Đăng ký để nhận link vào lớp + nhắc lịch tự động."}</p>
            {c.sessions.length === 0 ? <p className="text-ink-3 text-sm">Lịch sẽ cập nhật sớm.</p> : (
              <div>{c.sessions.map((s) => (
                <JoinLiveButton key={s.id} sessionId={s.id} title={s.title} startsAt={s.starts_at} durationMin={s.duration_min} enrolled={enrolled} recordingUrl={s.recording_url} />
              ))}</div>
            )}
          </div>
        </div>

        {/* Đăng ký */}
        <aside className="rounded-card border border-border bg-surface shadow-lg p-5 lg:sticky lg:top-24">
          <LiveRegister slug={c.slug} price={c.price} comparePrice={c.compare_price} enrolled={enrolled} soldOut={soldOut} />
          <ul className="mt-5 pt-5 border-t border-border space-y-2.5 text-sm text-ink-2">
            <li>✓ Học trực tiếp, tương tác với giảng viên</li>
            <li>✓ {c.sessions.length} buổi qua Google Meet</li>
            <li>✓ Nhắc lịch tự động (email + thông báo)</li>
            <li>✓ Xem lại bản ghi sau buổi học (nếu có)</li>
          </ul>
          {upcoming[0] && <p className="mt-4 text-center text-xs text-ink-3">Buổi gần nhất: <b className="text-ink-2">{new Date(upcoming[0].starts_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</b></p>}
        </aside>
      </div>
    </div>
  );
}
