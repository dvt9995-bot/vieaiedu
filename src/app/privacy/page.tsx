import type { Metadata } from "next";
export const metadata: Metadata = { title: "Chính sách bảo mật" };

export default function PrivacyPage() {
  return (
    <article className="container-x py-16 max-w-[760px]">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight">Chính sách bảo mật</h1>
      <p className="text-ink-3 text-sm mt-2 mb-8">Cập nhật: 19/06/2026 · (Bản mẫu — vui lòng rà soát pháp lý trước khi phát hành chính thức.)</p>
      <div className="space-y-6 text-ink-2 leading-relaxed">
        <section><h2 className="text-lg font-bold text-ink mb-1">1. Thông tin thu thập</h2><p>Chúng tôi thu thập: email, họ tên, tiến độ học tập, lịch sử mua khóa học và dữ liệu sử dụng để cải thiện dịch vụ.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">2. Mục đích sử dụng</h2><p>Để cung cấp khóa học, xử lý thanh toán, hỗ trợ học viên, gửi thông báo và (nếu bạn đồng ý) tin tức/khuyến mãi.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">3. Lưu trữ &amp; bảo mật</h2><p>Dữ liệu lưu trên hạ tầng Supabase với phân quyền (RLS). Mật khẩu được mã hóa. Thanh toán xử lý qua SePay, chúng tôi không lưu thông tin thẻ.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">4. Chia sẻ bên thứ ba</h2><p>Chỉ chia sẻ với nhà cung cấp cần thiết (thanh toán, email, phân tích). Không bán dữ liệu cá nhân.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">5. Quyền của bạn</h2><p>Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa dữ liệu cá nhân bằng cách liên hệ chúng tôi.</p></section>
        <section><h2 className="text-lg font-bold text-ink mb-1">6. Liên hệ</h2><p>privacy@vieaiedu.vn</p></section>
      </div>
    </article>
  );
}
