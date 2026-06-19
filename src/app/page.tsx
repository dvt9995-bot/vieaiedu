import Link from "next/link";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import CourseCard from "@/components/CourseCard";
import { POSTS } from "@/lib/mock";
import { getCourses } from "@/lib/courses";

const features = [
  { t: "Video bài bản", d: "Bài giảng HD theo lộ trình, học mọi lúc trên web và điện thoại.", p: "M3 5h18v14H3z M10 9l5 3-5 3z" },
  { t: "Dự án thực hành", d: "Project thực tế kèm code mẫu và tài liệu PDF tải về.", p: "M8 6l-5 6 5 6 M16 6l5 6-5 6" },
  { t: "Cộng đồng hỗ trợ", d: "Hỏi đáp, chia sẻ và nhận phản hồi từ học viên khác.", p: "M3 20a6 6 0 0112 0" },
  { t: "Lộ trình rõ ràng", d: "Theo dõi tiến độ, biết chính xác nên học gì tiếp theo.", p: "M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z" },
];

export default async function Home() {
  const featured = (await getCourses()).slice(0, 6);
  return (
    <>
      {/* Hero (theo bộ nhận diện) */}
      <Hero />

      {/* Features */}
      <section className="py-20 bg-bg-soft border-y border-border">
        <div className="container-x">
          <Reveal className="max-w-[640px] mx-auto text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">Mọi thứ bạn cần để học AI hiệu quả</h2>
            <p className="text-ink-2 text-lg mt-2">Thiết kế cho người bận rộn: học nhanh, thực hành thật, áp dụng được vào công việc.</p>
          </Reveal>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.t} delay={i * 60}>
                <div className="bg-surface border border-border rounded-card p-6 h-full transition-all hover:border-border-strong hover:shadow-soft hover:-translate-y-1">
                  <div className="w-[42px] h-[42px] rounded-[11px] bg-accent-weak flex items-center justify-center mb-4">
                    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-accent fill-none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={f.p} /></svg>
                  </div>
                  <h3 className="text-[1.08rem] font-bold mb-1">{f.t}</h3>
                  <p className="text-ink-2 text-sm">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="py-20">
        <div className="container-x">
          <Reveal className="max-w-[640px] mx-auto text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">Khóa học nổi bật</h2>
            <p className="text-ink-2 text-lg mt-2">Mua riêng từng khóa, học trọn đời. Nhấn ★ để lưu khóa yêu thích.</p>
          </Reveal>
          <div className="grid gap-[22px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c, i) => (
              <Reveal key={c.id} delay={i * 50}><CourseCard course={c} /></Reveal>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/courses" className="inline-flex rounded-full border border-border-strong hover:border-ink-3 font-semibold px-6 py-3 transition-colors">
              Xem tất cả khóa học →
            </Link>
          </div>
        </div>
      </section>

      {/* Community preview */}
      <section className="py-20 bg-bg-soft border-y border-border">
        <div className="container-x">
          <Reveal className="max-w-[640px] mx-auto text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">Học cùng cộng đồng</h2>
            <p className="text-ink-2 text-lg mt-2">Đăng bài, hỏi đáp, chia sẻ dự án và nhận phản hồi từ những người học AI khác.</p>
          </Reveal>
          <div className="max-w-[600px] mx-auto flex flex-col gap-4">
            {POSTS.slice(0, 2).map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <div className="bg-surface border border-border rounded-card p-[18px]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: p.avatarColor }}>{p.author[0]}</div>
                    <div><b className="text-sm">{p.author}</b><br /><span className="text-ink-3 text-xs">{p.time}</span></div>
                  </div>
                  <p className="text-[.96rem] mb-3">{p.body}</p>
                  <div className="flex gap-6 border-t border-border pt-3 text-ink-2 text-sm font-medium">
                    <span>♥ {p.likes}</span><span>💬 {p.comments}</span><span>↗ Chia sẻ</span>
                  </div>
                </div>
              </Reveal>
            ))}
            <div className="text-center mt-2">
              <Link href="/community" className="inline-flex rounded-full bg-ink hover:bg-black text-white font-semibold px-6 py-3 transition-colors">Vào cộng đồng →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink text-white text-center px-8 py-16">
              <svg className="absolute -right-20 top-1/2 -translate-y-1/2 w-[360px] opacity-[.06]" viewBox="0 0 200 200"><g fill="none" stroke="#fff" strokeWidth="1"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="62" /><circle cx="100" cy="100" r="32" /></g></svg>
              <h2 className="text-[clamp(1.8rem,3.6vw,2.8rem)] font-extrabold tracking-tight text-white">Sẵn sàng bắt đầu hành trình AI?</h2>
              <p className="text-white/70 max-w-[48ch] mx-auto mt-3.5 mb-8">Tạo tài khoản miễn phí trong 30 giây. Chỉ thanh toán khi bạn chọn mua khóa học.</p>
              <Link href="/courses" className="inline-flex rounded-full bg-white text-ink hover:bg-neutral-100 font-semibold px-7 py-3 transition-colors">Khám phá khóa học</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
