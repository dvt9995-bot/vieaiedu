-- Thêm khóa "AI Agent Builder" (Magic AI / Long Nam) vào catalog thật (bảng courses).
-- Bán qua landing riêng https://vieaiedu.vn/xaykenhai — ghi danh tự động qua /api/partner/enroll
-- khi Google Apps Script (backend SePay riêng của Magic AI) xác nhận thanh toán.
-- Chạy 1 lần trong Supabase SQL Editor.

insert into courses (
  slug, title, subtitle, description, category, level, price, compare_price,
  total_minutes, instructor, what_you_learn, status, position, format
) values (
  'ai-agent-builder',
  'AI Agent Builder — Xây kênh video tự động',
  '5 buổi Zoom trực tiếp: tự tay xây AI Agent tự nghiên cứu, tự làm video, tự đăng kênh',
  'Khoá học 5 buổi Zoom trực tiếp cùng Long Nam: bạn tự tay xây một AI Agent biết nhận việc qua tin nhắn — tự nghiên cứu nội dung, tự sản xuất video, tự đăng YouTube/TikTok chuẩn SEO. Không dạy thao tác cứng theo 1 tool, mà dạy nguyên lý thiết kế pipeline để tự thích nghi khi tool thay đổi. Không yêu cầu biết công nghệ. Ứng dụng: xây thương hiệu cá nhân, bán hàng, affiliate, kênh nội dung bật kiếm tiền nền tảng, hoặc làm dịch vụ video cho doanh nghiệp.',
  'Kinh doanh & AI',
  'beginner',
  2999000,
  NULL,
  750, -- 5 buổi x 2.5 giờ trung bình
  'Long Nam',
  array[
    'Cài đặt môi trường & chạy lệnh AI Agent đầu tiên (buổi 1)',
    'Dùng agent nghiên cứu thị trường, chốt ngách nội dung (buổi 2)',
    'Thiết kế pipeline sản xuất: Kịch bản → Giọng đọc → Hình ảnh → Ghép → Xuất bản (buổi 3 — xương sống)',
    'Tự động hoá đăng đa nền tảng: YouTube chuẩn SEO, TikTok/Reels cắt dọc, lên lịch (buổi 4)',
    'Vận hành, phản hồi cho agent, tự thiết kế pipeline mới khi đổi dạng video (buổi 5)'
  ],
  'published',
  0,
  'live'
)
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
  price = excluded.price, what_you_learn = excluded.what_you_learn, format = excluded.format,
  status = excluded.status;

-- 1 section tổng quan lộ trình 5 buổi (nội dung tham khảo trên trang khoá học;
-- lịch Zoom/Meet thật do Long Nam tự thêm sau ở live_sessions khi chốt ngày khai giảng)
with c as (select id from courses where slug = 'ai-agent-builder'),
sec as (
  insert into sections (course_id, title, position)
  select id, 'Lộ trình 5 buổi Zoom', 0 from c
  returning id
)
insert into lessons (section_id, course_id, title, type, duration_sec, is_preview, content, position)
select sec.id, c.id, v.title, 'article', v.duration_sec, v.is_preview, v.content, v.position
from sec, c,
(values
  ('Buổi 1 — Tư duy AI Agent & dựng nền móng', 9000, true,
   'AI Agent khác gì ChatGPT thường? Mô hình "giao việc như nhân viên". Cài đặt môi trường, tạo tài khoản — hướng dẫn từng bước cho người chưa từng đụng công nghệ. Kết quả: nhắn được tin đầu tiên cho agent và nhận kết quả ngay trong buổi.', 0),
  ('Buổi 2 — Agent nghiên cứu thị trường & chọn ngách', 9000, false,
   'Dùng agent phân tích người xem: họ là ai, cần gì, xem gì. Từ đó chốt ngách và định hướng nội dung riêng. Kết quả: bản định vị kênh + bộ ý tưởng, kịch bản đầu tiên do agent tự viết.', 1),
  ('Buổi 3 — Xác định dạng video & thiết kế pipeline sản xuất ⭐ Buổi xương sống', 9000, false,
   'Mỗi dạng video là 1 dây chuyền khác nhau: kể chuyện dài, faceless shorts, video kiến thức, video avatar... Học nguyên lý chung rồi tự "lắp ráp" pipeline riêng bằng cách giao việc cho agent. Kết quả: bản thiết kế pipeline riêng + video hoàn chỉnh đầu tiên do agent tự chạy.', 2),
  ('Buổi 4 — Xây kênh & tự động đăng đa nền tảng', 9000, false,
   'YouTube: agent tự tạo thumbnail, tiêu đề, mô tả, hashtag, từ khoá chuẩn SEO. TikTok/Reels: tự cắt định dạng dọc. Một nội dung — agent tự biến thể cho từng nền tảng và lên lịch đăng. Kết quả: kênh thật có video đăng hoàn toàn tự động.', 3),
  ('Buổi 5 — Vận hành, chỉnh sửa & mở rộng hệ thống', 9000, false,
   'Cách giao việc, phản hồi khi agent làm chưa ưng, tối ưu theo số liệu. Đặc biệt: tự thiết kế pipeline mới khi đổi dạng video hoặc mở kênh thứ hai — định hướng ứng dụng tạo thu nhập. Kết quả: sơ đồ hệ thống hoàn chỉnh + lộ trình tự mở rộng.', 4)
) as v(title, duration_sec, is_preview, content, position)
where not exists (
  select 1 from lessons l join sections s on s.id = l.section_id
  where s.course_id = (select id from c) and l.title = v.title
);

select 'migration-ai-agent-builder-course OK' as status;
