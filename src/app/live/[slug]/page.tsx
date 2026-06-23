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
import Countdown from "@/components/live/Countdown";
import FaqAccordion from "@/components/live/FaqAccordion";
import StickyCta from "@/components/live/StickyCta";
import { formatVND } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getLiveCourseBySlug(slug);
  if (!c) return { title: "Lớp học trực tiếp" };
  const url = `https://vieaiedu.vn/live/${slug}`;
  const desc = c.subtitle || c.description?.slice(0, 160) || "Lớp học trực tiếp qua Google Meet — VIE AI EDU.";
  return {
    title: `${c.title} — Lớp trực tiếp`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: `${c.title} — Lớp trực tiếp`, description: desc, images: c.thumb ? [c.thumb] : [] },
  };
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
  const nextDateStr = upcoming[0] ? new Date(upcoming[0].starts_at).toLocaleString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : null;

  return (
    <div className="container-x pt-5 pb-40 lg:py-8 overflow-x-hidden">
      <Link href="/live" className="text-sm text-ink-3 hover:text-ink">← Lớp học trực tiếp</Link>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 mt-3 lg:mt-4 items-start">
        {/* CỘT TRÁI: giới thiệu + mô tả */}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-accent bg-accent-weak rounded-full px-3 py-1">🔴 LỚP TRỰC TIẾP qua Google Meet</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 leading-snug">{c.title}</h1>
          {c.subtitle && <p className="text-base sm:text-lg text-ink-2 mt-2">{c.subtitle}</p>}
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-ink-3">
            {c.instructor && <span>Giảng viên: <b className="text-ink-2">{c.instructor}</b></span>}
            <span>📅 {c.sessions.length} buổi</span>
            {c.level && <span>🎯 {c.level}</span>}
            {(c.registered || 0) > 0 && <span>👥 <b className="text-ink-2">{c.registered}</b> đã đăng ký</span>}
            {seatsLeft !== null && <span className={seatsLeft <= 5 ? "text-accent font-semibold" : ""}>💺 còn {seatsLeft} chỗ</span>}
          </div>

          {c.thumb && (
            <div className="relative aspect-video rounded-card overflow-hidden border border-border mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumb} alt={c.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          {c.description?.trim() && <div className="mt-6"><AnimatedProse html={mdToHtml(c.description)} /></div>}

          {/* Ảnh kết quả học viên khóa trước (bằng chứng) */}
          {c.resultImages && c.resultImages.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1">Kết quả học viên khóa trước</h2>
              <p className="text-ink-3 text-sm mb-4">Hình ảnh & video thực tế từ học viên đã tham gia.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {c.resultImages.map((url, i) => (
                  /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url) ? (
                    <video key={i} src={url} controls playsInline preload="metadata" className="w-full rounded-card border border-border bg-black aspect-[9/16] object-cover" />
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-card overflow-hidden border border-border bg-bg-soft aspect-[9/16] hover:opacity-90">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Kết quả học viên ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  )
                ))}
              </div>
            </section>
          )}

          {/* Đánh giá học viên (social proof) */}
          {c.testimonials && c.testimonials.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-4">Học viên nói gì</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {c.testimonials.map((t, i) => (
                  <div key={i} className="rounded-card border border-border bg-surface p-5">
                    <div className="text-gold text-sm mb-2">{"★".repeat(Math.min(5, Math.max(1, t.rating)))}<span className="text-border-strong">{"★".repeat(5 - Math.min(5, Math.max(1, t.rating)))}</span></div>
                    <p className="text-sm text-ink-2 leading-relaxed">“{t.content}”</p>
                    <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border">
                      <div className="w-9 h-9 rounded-full bg-bg-soft overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {t.avatar ? <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center text-ink-3 font-bold">{t.name.charAt(0)}</span>}
                      </div>
                      <div className="min-w-0"><div className="font-semibold text-sm truncate">{t.name}</div>{t.role && <div className="text-xs text-ink-3 truncate">{t.role}</div>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cam kết / đảm bảo */}
          <section className="mt-10">
            <div className="rounded-card border border-success/30 bg-success/5 p-5 flex items-start gap-3">
              <span className="text-2xl shrink-0">🛡️</span>
              <div>
                <div className="font-bold text-success">Cam kết từ VIE AI EDU</div>
                <p className="text-sm text-ink-2 mt-1 leading-relaxed">{c.guarantee || "Học trực tiếp cùng giảng viên, hỏi đáp ngay trong buổi. Có bản ghi xem lại từng buổi — bạn không bao giờ bỏ lỡ. Hỗ trợ tận tình suốt khóa học."}</p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          {c.faq && c.faq.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-4">Câu hỏi thường gặp</h2>
              <FaqAccordion items={c.faq} />
            </section>
          )}

          {/* CTA lặp lại cuối nội dung */}
          {!enrolled && (
            <section className="mt-10 rounded-card bg-ink text-white p-6 text-center">
              <div className="text-xl font-extrabold">Sẵn sàng bắt đầu?</div>
              <p className="text-white/70 text-sm mt-1">{nextDateStr ? `Khai giảng ${nextDateStr}` : "Lớp đang mở đăng ký"}{seatsLeft !== null ? ` · còn ${seatsLeft} chỗ` : ""}</p>
              <a href="#register" className="inline-block mt-4 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-7 py-3">Đăng ký giữ chỗ ngay →</a>
            </section>
          )}
        </div>

        {/* CỘT PHẢI: giảng viên + đăng ký (CTA) + lịch học */}
        <aside className="space-y-4 lg:sticky lg:top-24 min-w-0">
          {/* Giảng viên — đưa lên đầu */}
          {(c.instructor || c.instructorBio || c.instructorAvatar) && (
            <div className="rounded-card border border-border bg-surface p-4 flex items-start gap-3">
              <div className="w-14 h-14 rounded-full bg-bg-soft overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.instructorAvatar ? <img src={c.instructorAvatar} alt={c.instructor || "Giảng viên"} className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center text-xl text-ink-3 font-bold">{(c.instructor || "G").charAt(0)}</span>}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-accent font-semibold">Giảng viên</div>
                <div className="font-bold">{c.instructor || "Giảng viên VIE AI EDU"}</div>
                {c.instructorBio && <p className="text-xs text-ink-2 mt-1 leading-relaxed whitespace-pre-line line-clamp-4">{c.instructorBio}</p>}
              </div>
            </div>
          )}

          {/* Thẻ giá + kêu gọi mua hàng */}
          <div id="register" className="rounded-card border-2 border-accent/30 bg-surface shadow-lg overflow-hidden scroll-mt-24">
            {/* Băng khẩn cấp */}
            <div className="bg-accent text-white text-center text-sm font-semibold py-2 px-3">
              {soldOut ? "⚠ Đã đầy chỗ — mở đợt sau"
                : seatsLeft !== null && seatsLeft <= 10 ? `🔥 Sắp đầy — chỉ còn ${seatsLeft} chỗ!`
                : nextDateStr ? `🔴 Khai giảng: ${nextDateStr}` : "🔴 Đang mở đăng ký"}
            </div>
            <div className="p-5">
              <div className="text-center mb-3">
                <div className="text-base font-extrabold text-ink">🎓 Giữ chỗ học trực tiếp cùng giảng viên</div>
                <div className="text-xs text-ink-3 mt-0.5">Tương tác trực tiếp · hỏi đáp ngay · có video xem lại</div>
                {!enrolled && upcoming[0] && (
                  <div className="mt-3 rounded-lg bg-gold/20 border border-gold/40 py-2 px-3">
                    <div className="text-[11px] font-semibold text-amber-700 mb-1">⏳ Khai giảng sau</div>
                    <Countdown target={upcoming[0].starts_at} />
                  </div>
                )}
              </div>
              <LiveRegister slug={c.slug} title={c.title} price={c.price} comparePrice={c.compare_price} enrolled={enrolled} soldOut={soldOut} />
              {!enrolled && (
                <div className="mt-3 rounded-lg bg-bg-soft p-3 text-center text-xs text-ink-2">
                  💬 Thanh toán an toàn qua SePay · Xác nhận tự động trong vài giây<br />Đăng ký xong nhận ngay <b>lịch học + nhắc giờ tự động</b>
                </div>
              )}
              <ul className="mt-4 pt-4 border-t border-border space-y-2 text-sm text-ink-2">
                <li>✓ Học trực tiếp, tương tác real-time với giảng viên</li>
                <li>✓ {c.sessions.length} buổi qua Google Meet</li>
                <li>✓ Nhắc lịch tự động (email + thông báo)</li>
                <li>✓ Xem lại bản ghi sau mỗi buổi</li>
              </ul>
            </div>
          </div>

          {/* Lịch học */}
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-lg">📅 Lịch học</h2>
              <span className="text-xs text-ink-3">{c.sessions.length} buổi</span>
            </div>
            <p className="text-ink-3 text-xs mb-3">{enrolled ? "Bấm “Vào lớp ngay” khi đến giờ (mở 15 phút trước)." : "Đăng ký để nhận link vào lớp + nhắc lịch tự động."}</p>
            {c.sessions.length === 0 ? <p className="text-ink-3 text-sm">Lịch sẽ cập nhật sớm.</p> : (
              <div>{c.sessions.map((s) => (
                <JoinLiveButton key={s.id} sessionId={s.id} title={s.title} startsAt={s.starts_at} durationMin={s.duration_min} enrolled={enrolled} recordingUrl={s.recording_url} />
              ))}</div>
            )}
          </div>
        </aside>
      </div>
      {!enrolled && <StickyCta price={c.price} soldOut={soldOut} />}
    </div>
  );
}
