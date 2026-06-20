import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản và điều kiện sử dụng nền tảng học AI VIE AI EDU.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="container-x py-16 max-w-[760px]">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight">Điều khoản sử dụng</h1>
      <p className="text-ink-3 text-sm mt-2 mb-8">Cập nhật: 19/06/2026 · (Bản mẫu — vui lòng rà soát pháp lý trước khi phát hành chính thức.)</p>
      <div className="space-y-6 text-ink-2 leading-relaxed">
        <section><h2 className="text-lg font-bold text-ink mb-1">1. Chấp nhận điều khoản</h2><p>Khi truy cập và sử dụng VIE AI EDU (vieaiedu.vn), bạn đồng ý với các điều khoản dưới đây.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">2. Tài khoản</h2><p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập. Đăng nhập chỉ bắt buộc khi mua hoặc học khóa học.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">3. Mua khóa học &amp; thanh toán</h2><p>Khóa học được mua riêng lẻ, truy cập trọn đời sau khi thanh toán thành công qua SePay. Giá hiển thị đã gồm các loại phí áp dụng.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">4. Hoàn tiền</h2><p>Yêu cầu hoàn tiền được xem xét trong vòng 7 ngày kể từ ngày mua nếu bạn chưa học quá 20% nội dung khóa học.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">5. Sở hữu trí tuệ</h2><p>Toàn bộ nội dung khóa học thuộc sở hữu của VIE AI EDU và giảng viên. Nghiêm cấm sao chép, phân phối lại khi chưa được phép.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">6. Quy tắc cộng đồng</h2><p>Không đăng nội dung vi phạm pháp luật, spam hoặc xúc phạm. Quản trị viên có quyền gỡ bài và khóa tài khoản vi phạm.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">7. Liên hệ</h2><p>Mọi thắc mắc: hello@vieaiedu.vn</p></section>
      </div>
    </article>
  );
}
