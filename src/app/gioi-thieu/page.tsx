import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import JoinButton from "@/components/JoinButton";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Giới thiệu — Cộng đồng AI của người Việt",
  description: "VIE AI EDU: nơi người Việt học AI miễn phí, cập nhật tin tức mỗi ngày, chia sẻ kinh nghiệm và cùng nhau phát triển. Tham gia miễn phí ngay hôm nay.",
  alternates: { canonical: "/gioi-thieu" },
};

const benefits = [
  { icon: "🎓", t: "Học AI miễn phí, bài bản", d: "Khóa học từ nhập môn tới thực chiến, lộ trình rõ ràng. Bắt đầu mà không tốn một đồng — chỉ trả phí khi bạn muốn học sâu hơn." },
  { icon: "📰", t: "Tin tức AI mỗi ngày", d: "Cập nhật xu hướng, công cụ và tính năng AI mới nhất từ OpenAI, Google, TechCrunch… được biên tập sang tiếng Việt dễ hiểu." },
  { icon: "🤝", t: "Không học một mình", d: "Hỏi đáp, chia sẻ dự án, nhận góp ý từ cộng đồng. Đi cùng nhau để đi xa hơn — bạn luôn có người đồng hành." },
  { icon: "💸", t: "Học và kiếm tiền", d: "Giới thiệu bạn bè, nhận hoa hồng thật vào ví và rút về ngân hàng. Lan tỏa tri thức đồng thời có thêm thu nhập." },
  { icon: "🏆", t: "Chứng chỉ & hồ sơ", d: "Hoàn thành khóa học nhận chứng chỉ, có thẻ học viên và hồ sơ công khai để ghi dấu hành trình của bạn." },
  { icon: "📱", t: "Học mọi lúc, mọi nơi", d: "Cài như ứng dụng trên điện thoại (PWA), nhận thông báo nhắc học. Tiến độ được lưu, tiếp tục bất cứ khi nào." },
];

export default function AboutPage() {
  const orgLd = {
    "@context": "https://schema.org", "@type": "AboutPage",
    name: "Giới thiệu VIE AI EDU", url: "https://vieaiedu.vn/gioi-thieu",
    description: "Cộng đồng & nền tảng học AI dành cho người Việt.",
  };
  return (
    <>
      <JsonLd data={orgLd} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_85%_0%,#fdeced_0%,#fff6f6_38%,#ffffff_70%)]">
        <div className="container-x py-20 lg:py-28 text-center max-w-[860px] mx-auto">
          <Reveal as="span" className="inline-flex items-center gap-2 border border-accent/20 bg-white rounded-full px-3.5 py-1.5 text-[.82rem] font-semibold text-accent shadow-soft mb-6">
            <span className="w-[7px] h-[7px] rounded-full bg-success" /> Cộng đồng AI của người Việt
          </Reveal>
          <Reveal as="h1" className="text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold tracking-[-.03em] leading-[1.08]">
            Nơi bạn <span className="text-accent">không học AI một mình</span>
          </Reveal>
          <Reveal as="p" className="text-[clamp(1.05rem,1.6vw,1.25rem)] text-ink-2 max-w-[60ch] mx-auto mt-5">
            VIE AI EDU là cộng đồng người Việt cùng nhau học, chia sẻ và ứng dụng AI. Kiến thức mở, tin tức cập nhật mỗi ngày, có người đồng hành — và cả cơ hội kiếm thêm thu nhập.
          </Reveal>
          <Reveal className="flex gap-3 justify-center flex-wrap mt-8">
            <JoinButton label="Tham gia miễn phí" />
            <Link href="/community" className="rounded-full border border-border-strong hover:border-accent hover:text-accent bg-surface font-semibold text-base px-7 py-3 transition-colors">Xem cộng đồng</Link>
          </Reveal>
        </div>
      </section>

      {/* Lợi ích */}
      <section className="py-12 md:py-20 bg-bg-soft border-y border-border">
        <div className="container-x">
          <Reveal className="max-w-[640px] mx-auto text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">Bạn nhận được gì khi tham gia?</h2>
            <p className="text-ink-2 text-lg mt-2">Tất cả vì sự tiến bộ của bạn — bắt đầu miễn phí, đi xa cùng cộng đồng.</p>
          </Reveal>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.t} delay={i * 50}>
                <div className="bg-surface border border-border rounded-card p-6 h-full transition-all hover:border-border-strong hover:shadow-soft hover:-translate-y-1">
                  <div className="text-3xl mb-3">{b.icon}</div>
                  <h3 className="text-[1.08rem] font-bold mb-1.5">{b.t}</h3>
                  <p className="text-ink-2 text-sm leading-relaxed">{b.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Giá trị / triết lý */}
      <section className="py-12 md:py-20">
        <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-extrabold tracking-tight leading-tight">Chúng tôi tin: <span className="text-accent">tri thức nên được mở</span></h2>
            <p className="text-ink-2 mt-4 leading-relaxed">AI đang thay đổi cách chúng ta học tập và làm việc. Nhưng nhiều người Việt vẫn ngại bắt đầu vì rào cản ngôn ngữ, chi phí và cảm giác đơn độc.</p>
            <p className="text-ink-2 mt-3 leading-relaxed">VIE AI EDU sinh ra để xóa bỏ những rào cản đó: nội dung tiếng Việt dễ hiểu, khóa học miễn phí để khởi đầu, và một cộng đồng luôn sẵn sàng hỗ trợ bạn từng bước.</p>
            <p className="font-semibold text-ink mt-4">Kiến tạo tri thức — Dẫn lối tương lai.</p>
          </Reveal>
          <Reveal className="grid grid-cols-2 gap-4">
            {[["Miễn phí", "Bắt đầu không tốn phí"], ["Tiếng Việt", "Dễ hiểu, gần gũi"], ["Mỗi ngày", "Tin AI mới liên tục"], ["Cùng nhau", "Cộng đồng đồng hành"]].map(([t, s]) => (
              <div key={t} className="rounded-card border border-border bg-bg-soft p-5 text-center">
                <div className="text-xl font-extrabold text-accent">{t}</div>
                <div className="text-ink-3 text-sm mt-1">{s}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Cách bắt đầu */}
      <section className="py-12 md:py-20 bg-bg-soft border-y border-border">
        <div className="container-x max-w-[820px] mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">Bắt đầu trong 1 phút</h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
            {[["1", "Tạo tài khoản miễn phí", "Chỉ cần email — và nhận ngay quà chào mừng."], ["2", "Học & khám phá", "Vào học khóa miễn phí, đọc tin AI, tham gia cộng đồng."], ["3", "Phát triển & kiếm tiền", "Nhận chứng chỉ, mời bạn bè và nhận hoa hồng."]].map(([n, t, s], i) => (
              <Reveal key={n} delay={i * 60}>
                <div className="bg-surface border border-border rounded-card p-6 h-full">
                  <div className="w-9 h-9 rounded-full bg-accent text-white grid place-items-center font-bold mb-3">{n}</div>
                  <h3 className="font-bold mb-1">{t}</h3>
                  <p className="text-ink-2 text-sm">{s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA cuối */}
      <section className="py-12 md:py-20">
        <div className="container-x">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink text-white text-center px-8 py-16">
              <svg className="absolute -right-20 top-1/2 -translate-y-1/2 w-[360px] opacity-[.06]" viewBox="0 0 200 200"><g fill="none" stroke="#fff" strokeWidth="1"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="62" /><circle cx="100" cy="100" r="32" /></g></svg>
              <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold tracking-tight text-white">Hành trình AI của bạn bắt đầu hôm nay</h2>
              <p className="text-white/70 max-w-[48ch] mx-auto mt-3 mb-8">Miễn phí, không cần thẻ tín dụng. Tham gia cùng cộng đồng người Việt đang học và ứng dụng AI mỗi ngày.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <JoinButton label="Tham gia miễn phí ngay" />
                <Link href="/courses" className="rounded-full bg-white text-ink hover:bg-neutral-100 font-semibold px-7 py-3 transition-colors">Xem khóa học</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
