# 99% AI — Web app khóa học (Next.js + PWA)

Nền tảng học AI: khóa học video, quiz, chứng chỉ, cộng đồng, admin no-code.
Hiện chạy bằng **mock data** để xem ngay; nối Supabase/SePay/Bunny khi sẵn sàng.

## Chạy local
```bash
npm install
npm run dev      # http://localhost:3000
# hoặc bản production:
npm run build && npm run start
```

## Cấu trúc
```
src/app/                 Các route (App Router)
  page.tsx               Trang chủ
  courses/               Danh sách + chi tiết khóa
  learn/[slug]/          Trang học: player, quiz, ghi chú, tiến độ
  community/             Feed cộng đồng
  dashboard/             Bảng học viên
  blog/                  Blog (SEO)
  certificate/[code]/    Xác thực chứng chỉ
  login, register/       Auth
  admin/                 Quản trị no-code
src/components/          Navbar, Footer, CourseCard, LearnClient, AdminClient...
src/lib/                 types, mock data, format, supabase client
supabase/schema.sql      Schema DB + RLS (multi-instructor ready)
docs/ARCHITECTURE.md     Sitemap + luồng người dùng
public/                  manifest.webmanifest, sw.js, icon.svg (PWA)
```

## Tính năng đã có (MVP)
- ✅ Trang chủ, khóa học (tìm kiếm + lọc), chi tiết khóa + bài xem thử
- ✅ Trang học: player, lưu vị trí/tiến độ (localStorage), ghi chú theo mốc, quiz chấm tự động, chứng chỉ
- ✅ Dashboard "tiếp tục học" + tiến độ, Cộng đồng (đăng/like/bình luận), Blog
- ✅ Auth (trang + modal), Admin no-code (khóa/cộng đồng/doanh thu)
- ✅ PWA (cài trên điện thoại), SEO (Course JSON-LD), responsive, a11y, prefers-reduced-motion

## Nối backend (bước tiếp theo)
1. Tạo dự án Supabase → chạy `supabase/schema.sql`. Điền `.env.local` (xem `.env.local.example`).
2. Đổi data-layer trong `src/lib` từ mock sang truy vấn Supabase (giữ nguyên `types.ts`).
3. Thanh toán: route webhook SePay → cập nhật `orders` = paid → tạo `enrollments`.
4. Video: upload lên Bunny.net → lưu `video_id` ở `lessons` → phát bằng signed URL.
5. Deploy lên Vercel, trỏ domain 99ai.vn.

> Thiết kế: tối giản, font Inter, 1 màu nhấn đỏ; họa tiết trống đồng cài cắm tinh tế ở nền.
