-- Chạy thêm trong Supabase SQL Editor (bổ sung cho schema.sql) — bảng đăng ký nhận tin.
create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz not null default now()
);
alter table subscribers enable row level security;
-- Không tạo policy: chỉ service role (API /api/subscribe) được ghi; bảo vệ email khỏi truy cập công khai.
