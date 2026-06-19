import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-32 text-center">
      <div className="text-[clamp(4rem,12vw,8rem)] font-extrabold tracking-tight text-accent leading-none">404</div>
      <h1 className="text-2xl font-extrabold tracking-tight mt-2">Không tìm thấy trang</h1>
      <p className="text-ink-2 mt-2 max-w-[44ch] mx-auto">Trang bạn tìm không tồn tại hoặc đã được chuyển. Quay lại khám phá khóa học nhé.</p>
      <div className="flex gap-3 justify-center mt-8">
        <Link href="/" className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Về trang chủ</Link>
        <Link href="/courses" className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold px-6 py-3 transition-colors">Xem khóa học</Link>
      </div>
    </div>
  );
}
