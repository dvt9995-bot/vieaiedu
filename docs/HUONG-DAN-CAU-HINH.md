# Hướng dẫn cấu hình: Sentry · next/image · Email Resend

## 1. Sentry (theo dõi lỗi production)

Hệ thống đã có sẵn theo dõi lỗi nhẹ (lỗi giao diện → báo admin qua chuông). Để dùng Sentry đầy đủ:

1. Tạo tài khoản tại https://sentry.io → **Create Project** → chọn **Next.js**.
2. Sao chép **DSN** (dạng `https://abc123@o0.ingest.sentry.io/0`).
3. Tại thư mục dự án, chạy wizard chính thức (tự thêm config + source maps):
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   Làm theo hướng dẫn (đăng nhập, chọn project). Wizard sẽ tạo `sentry.*.config.ts`, sửa `next.config.ts`, thêm `.sentryclirc`.
4. Thêm biến môi trường trên Vercel (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SENTRY_DSN` = DSN ở bước 2
   - `SENTRY_AUTH_TOKEN` = token (wizard cấp, để upload source map)
5. Commit + push → Vercel deploy. Lỗi sẽ tự lên dashboard Sentry.

> Lưu ý: stack đang dùng Next 16 + Turbopack (rất mới). Nếu wizard báo lỗi tương thích, dùng bản Sentry mới nhất; hoặc giữ nguyên cơ chế "lỗi → báo admin" hiện có (đã đủ cho giai đoạn đầu).

## 2. next/image (tối ưu ảnh)

ĐÃ cấu hình:
- `next.config.ts` → `images.remotePatterns` cho phép tối ưu ảnh từ `*.supabase.co`.
- Logo (Navbar) và ảnh Hero đã chuyển sang `<Image>` (LCP nhanh hơn, có `priority`).

Ảnh **tin tức từ nguồn ngoài** (domain bất kỳ) vẫn để `<img>` có `loading="lazy"` — không nên tối ưu qua next/image vì domain không xác định trước. Nếu muốn tối ưu thêm ảnh từ một nguồn cụ thể, thêm hostname vào `remotePatterns` rồi đổi `<img>` → `<Image>` (kèm width/height).

## 3. Email gửi từ @vieaiedu.vn (Resend)

1. Vào https://resend.com → **Domains** → kiểm tra `vieaiedu.vn`:
   - Nếu **Verified** ✅ → sang bước 2.
   - Nếu **Pending** → vào nhà cung cấp DNS (nơi quản lý vieaiedu.vn) thêm đủ các bản ghi Resend yêu cầu (SPF `TXT`, DKIM `TXT`, và MX nếu có). Đợi 5–30 phút rồi bấm **Verify** lại.
2. Khi đã Verified, vào **Admin → Cài đặt → Tích hợp & API key**:
   - `Email gửi (From)` = `VIE AI EDU <no-reply@vieaiedu.vn>`
   - (Tùy chọn) dán `Resend API key` nếu muốn quản lý trong app thay vì env.
   - Bấm **Lưu tất cả** → áp dụng ngay, không cần deploy.
3. Kiểm tra: gửi 1 email thử (ví dụ đăng ký newsletter) → email đến từ `@vieaiedu.vn`.

> Hiện `From` đang để trống → hệ thống dùng mặc định `no-reply@longnam.com`. Đổi theo bước trên để email mang thương hiệu + vào inbox tốt hơn.
