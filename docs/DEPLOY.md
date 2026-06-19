# VIE AI EDU — Hướng dẫn đưa lên chạy thật

Kiến trúc: **danh mục khóa học nằm trong code** (`src/lib/mock.ts`); **Supabase** lưu dữ liệu người dùng (tài khoản, đơn hàng, ghi danh, tiến độ, cộng đồng); **SePay** xử lý thanh toán; **Bunny.net** lưu video; deploy **Vercel** + domain **vieaiedu.vn**.

> App đã chạy được ngay với mock data. Làm các bước dưới để bật chế độ thật.

## 1. Supabase
1. Tạo project tại supabase.com → vào **SQL Editor** → dán toàn bộ `supabase/schema.sql` → **Run**.
2. **Settings → API**: copy `Project URL`, `anon public key`, `service_role key`.
3. **Authentication → Providers**: bật **Email**; bật **Google** (điền OAuth client ID/secret từ Google Cloud, thêm redirect `https://vieaiedu.vn/auth/callback`).
4. Điền vào `.env.local` (và Vercel env): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 2. SePay (thanh toán)
1. Đăng nhập sepay.vn → liên kết tài khoản ngân hàng nhận tiền.
2. Lấy **số tài khoản** + **mã ngân hàng** → `SEPAY_ACCOUNT`, `SEPAY_BANK`.
3. **Webhook**: trỏ về `https://vieaiedu.vn/api/sepay/webhook`, đặt API key → `SEPAY_WEBHOOK_API_KEY` (khai cùng giá trị trong env).
4. Luồng: user bấm Mua → tạo order pending + hiện QR (nội dung CK là mã `VIE...`) → user chuyển khoản → SePay gọi webhook → đối chiếu nội dung+số tiền → order `paid` + tạo enrollment → trang tự chuyển vào học.

## 3. Bunny.net (video)
1. Tạo Stream Library → lấy `Library ID` + `API key` → `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`.
2. Upload video, lấy video id, gán vào `videoId` của bài học trong `src/lib/mock.ts` (hoặc chuyển sang quản trị DB sau).
3. Phát bằng signed URL (token) để chống tải trộm.

## 4. Deploy Vercel + domain
1. Đẩy code lên GitHub → **Import** vào Vercel.
2. **Settings → Environment Variables**: khai báo tất cả biến ở `.env.local.example`.
3. Deploy. **Settings → Domains**: thêm `vieaiedu.vn` → cập nhật DNS theo hướng dẫn Vercel (A/CNAME).
4. Cập nhật `NEXT_PUBLIC_SITE_URL=https://vieaiedu.vn` và redirect Google OAuth cho khớp domain.

## Trạng thái tích hợp
- ✅ Auth (email + Google), middleware phiên, trang/modal đăng nhập
- ✅ Thanh toán SePay: checkout + QR + webhook đối soát + tạo enrollment; khóa free ghi danh ngay
- ✅ RLS bảo vệ dữ liệu người dùng; enrollment chỉ tạo bởi server (service role)
- ⏳ Còn lại (đã có bảng DB, sẽ nối UI ở bước sau): lưu tiến độ/ghi chú/quiz lên DB (hiện localStorage), favorites & cộng đồng lên DB (hiện cục bộ/mock), gate trang học theo enrollment, trang admin ghi DB.
