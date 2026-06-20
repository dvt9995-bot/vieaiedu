import Image from "next/image";
import Reveal from "@/components/Reveal";
import HeroActions from "@/components/HeroActions";
import { getConfig } from "@/lib/settings";

/* Hero theo Bộ nhận diện VIE AI EDU. Admin có thể đặt ảnh/video nền tùy chỉnh
   (Cài đặt → Nền Hero). Khi có media → chế độ nền tối, chữ trắng. */
export default async function Hero() {
  const [bgVideo, bgImage] = await Promise.all([
    getConfig("hero_bg_video"),
    getConfig("hero_bg_image"),
  ]);
  const hasMedia = !!(bgVideo || bgImage);

  return (
    <section className={`relative overflow-hidden ${hasMedia ? "bg-ink" : "bg-[radial-gradient(120%_120%_at_85%_0%,#fdeced_0%,#fff6f6_38%,#ffffff_70%)]"}`}>
      {hasMedia ? (
        <>
          {/* Nền media tùy chỉnh */}
          {bgVideo ? (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay muted loop playsInline preload="auto"
              poster={bgImage || undefined}
              aria-hidden
            >
              <source src={bgVideo} />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
          )}
          {/* Lớp phủ tối để chữ rõ (đậm hơn ở bên trái — vùng tiêu đề) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" aria-hidden />
        </>
      ) : (
        /* Silhouette thành phố ở đáy (mặc định) */
        <svg className="absolute bottom-0 inset-x-0 w-full h-[180px] opacity-[.10] pointer-events-none" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMax meet" aria-hidden>
          <g fill="#e41e26">
            {Array.from({ length: 40 }).map((_, i) => {
              const w = 24 + ((i * 37) % 22);
              const h = 50 + ((i * 53) % 120);
              return <rect key={i} x={i * 30} y={180 - h} width={w} height={h} rx="2" />;
            })}
          </g>
        </svg>
      )}

      <div className={`container-x relative ${hasMedia ? "" : "grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center"} pt-12 pb-16 lg:py-28`}>
        {/* Text */}
        <div className={hasMedia ? "max-w-[58ch]" : ""}>
          <Reveal as="span" className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[.82rem] font-semibold mb-6 ${hasMedia ? "border border-white/25 bg-white/10 text-white backdrop-blur-sm" : "border border-accent/20 bg-white text-accent shadow-soft"}`}>
            <span className="w-[7px] h-[7px] rounded-full bg-success" /> Kiến tạo tri thức · Dẫn lối tương lai
          </Reveal>
          <Reveal as="h1" className={`text-[clamp(2.3rem,5vw,4rem)] font-extrabold tracking-[-.03em] leading-[1.06] max-w-[18ch] ${hasMedia ? "text-white" : ""}`}>
            Cộng đồng <span className={hasMedia ? "text-gold" : "text-accent"}>AI</span> của người Việt
          </Reveal>
          <Reveal as="p" className={`text-[clamp(1.05rem,1.5vw,1.2rem)] max-w-[52ch] mt-5 ${hasMedia ? "text-white/85" : "text-ink-2"}`}>
            Nơi cập nhật tin tức AI mới nhất, chia sẻ kinh nghiệm và học hỏi cùng nhau. Kiến thức mở, khóa học miễn phí, cùng nhau tiến bộ.
          </Reveal>
          <Reveal><HeroActions /></Reveal>
          <Reveal className={`flex gap-8 flex-wrap mt-9 text-sm font-medium ${hasMedia ? "text-white/70" : "text-ink-3"}`}>
            <span>📰 Tin AI cập nhật mỗi ngày</span>
            <span>🎓 Khóa học miễn phí</span>
            <span>🤝 Chia sẻ &amp; kết nối</span>
          </Reveal>
        </div>

        {/* Minh họa AI mặc định (ẩn khi dùng media tùy chỉnh) */}
        {!hasMedia && (
          <Reveal className="relative mx-auto w-[min(460px,92vw)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(228,30,38,.10),transparent_62%)] blur-2xl" aria-hidden />
            <Image src="/hero-ai.png" alt="Mạng nơ-ron AI" width={460} height={460} priority className="relative w-full h-auto drop-shadow-[0_24px_48px_rgba(228,30,38,.18)]" />
          </Reveal>
        )}
      </div>
    </section>
  );
}
