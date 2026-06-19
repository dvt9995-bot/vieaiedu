import Reveal from "@/components/Reveal";
import HeroActions from "@/components/HeroActions";

/* Hero theo Bộ nhận diện VIE AI EDU: gradient đỏ nhạt + silhouette thành phố +
   não AI trong vòng tròn công nghệ + cờ sao vàng. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_85%_0%,#fdeced_0%,#fff6f6_38%,#ffffff_70%)]">
      {/* Silhouette thành phố ở đáy */}
      <svg className="absolute bottom-0 inset-x-0 w-full h-[180px] opacity-[.10] pointer-events-none" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMax meet" aria-hidden>
        <g fill="#e41e26">
          {Array.from({ length: 40 }).map((_, i) => {
            const w = 24 + ((i * 37) % 22);
            const h = 50 + ((i * 53) % 120);
            return <rect key={i} x={i * 30} y={180 - h} width={w} height={h} rx="2" />;
          })}
        </g>
      </svg>

      <div className="container-x relative grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center pt-20 pb-24 lg:py-28">
        {/* Text */}
        <div>
          <Reveal as="span" className="inline-flex items-center gap-2 border border-accent/20 bg-white rounded-full px-3.5 py-1.5 text-[.82rem] font-semibold text-accent shadow-soft mb-6">
            <span className="w-[7px] h-[7px] rounded-full bg-success" /> Kiến tạo tri thức · Dẫn lối tương lai
          </Reveal>
          <Reveal as="h1" className="text-[clamp(2.3rem,5vw,4rem)] font-extrabold tracking-[-.03em] leading-[1.06] max-w-[18ch]">
            Nền tảng học <span className="text-accent">AI</span> dành cho người Việt
          </Reveal>
          <Reveal as="p" className="text-[clamp(1.05rem,1.5vw,1.2rem)] text-ink-2 max-w-[52ch] mt-5">
            Học từ chuyên gia, thực hành dự án thật và đồng hành cùng cộng đồng. Ứng dụng AI để bứt phá trong học tập và sự nghiệp.
          </Reveal>
          <Reveal><HeroActions /></Reveal>
          <Reveal className="flex gap-8 flex-wrap mt-9 text-ink-3 text-sm font-medium">
            <span><b className="text-ink font-bold">10.000+</b> học viên</span>
            <span><b className="text-ink font-bold">50+</b> khóa học</span>
            <span><b className="text-ink font-bold">4.9/5</b> đánh giá</span>
          </Reveal>
        </div>

        {/* Minh họa AI (ảnh render, theo brand đỏ–vàng) */}
        <Reveal className="relative mx-auto w-[min(460px,92vw)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(228,30,38,.10),transparent_62%)] blur-2xl" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-ai.png" alt="Mạng nơ-ron AI" className="relative w-full h-auto drop-shadow-[0_24px_48px_rgba(228,30,38,.18)]" />
        </Reveal>
      </div>
    </section>
  );
}
