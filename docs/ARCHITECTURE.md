# VIE AI EDU — Kiến trúc, Sitemap & Luồng người dùng

## Stack
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript → build PWA.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime). RLS bật toàn bộ (xem `supabase/schema.sql`).
- **Thanh toán:** SePay (QR/chuyển khoản đối soát tự động qua webhook).
- **Video:** Bunny.net (signed playback URL chống tải trộm).
- **Deploy:** Vercel (frontend) + Supabase (DB) — domain vieaiedu.vn.

> Giai đoạn dựng khung hiện dùng **mock data** (`src/lib/mock.ts`) để app chạy ngay mà chưa cần Supabase. Khi có khóa Supabase, đổi data-layer sang client thật, schema đã sẵn.

## Sitemap
```
/                         Trang chủ (hero, tính năng, khóa nổi bật, cộng đồng, CTA)
/courses                  Danh sách khóa — tìm kiếm + lọc (chủ đề/cấp độ/giá)
/courses/[slug]           Chi tiết khóa — preview free, curriculum, review, mua
/learn/[slug]             Trang học — video player, bài học, ghi chú, quiz, tiến độ
/dashboard                Bảng học viên — tiếp tục học, tiến độ, chứng chỉ
/community                Feed cộng đồng — đăng bài, like, bình luận
/blog  /blog/[slug]       Nội dung miễn phí (SEO)
/certificate/[code]       Trang xác thực chứng chỉ công khai
/login  /register         Auth (cũng có modal nhanh)
/admin                    Quản trị no-code (khóa, bài, quiz, duyệt, doanh thu)
```

## Vai trò
- **Khách (chưa đăng nhập):** xem mọi thứ công khai + bài học **preview**. Đăng nhập chỉ bắt buộc khi **mua / học bài không-preview**.
- **Học viên:** mua, học, ghi chú, làm quiz, nhận chứng chỉ, đăng cộng đồng.
- **Giảng viên** (bật sau): tạo/sửa khóa của mình. MVP chỉ có 1 (bạn).
- **Admin:** toàn quyền qua `/admin`.

## Luồng chính

### 1. Khách → Mua → Học
```
Trang chủ / /courses
   └─ /courses/[slug]  → xem preview free, curriculum, review
        └─ bấm "Mua khóa"
             ├─ chưa đăng nhập → modal đăng nhập/đăng ký
             └─ đã đăng nhập → tạo order (status=pending)
                  └─ SePay QR → user chuyển khoản
                       └─ webhook SePay → order=paid → tạo enrollment
                            └─ chuyển vào /learn/[slug]
```

### 2. Học & hoàn thành
```
/learn/[slug]
   ├─ chọn bài → video player (lưu last_position_sec mỗi 5s)
   ├─ đánh dấu hoàn thành → cập nhật % tiến độ khóa
   ├─ ghi chú theo mốc video (notes)
   ├─ làm quiz cuối chương → chấm tự động → quiz_attempts
   └─ khi 100% bài + quiz đạt → phát hành certificate (code)
        └─ tải PDF / chia sẻ link /certificate/[code]
```

### 3. Khóa miễn phí / preview
- `is_free` (price=0): bấm "Học miễn phí" → tạo enrollment ngay, không qua SePay.
- Bài `is_preview=true`: khách xem không cần đăng nhập (tăng chuyển đổi).

## Quy ước
- Tiền: VND, lưu integer (đồng). Hiển thị "499.000đ".
- Tất cả route động đều có metadata/OG + JSON-LD `Course` cho SEO.
- A11y WCAG AA: focus rõ, contrast ≥4.5:1, phụ đề video, `prefers-reduced-motion`.
