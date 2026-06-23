-- ===== Chương trình Giảng viên (Creator Program) =====
-- 1) Khóa học: chủ sở hữu + trạng thái duyệt + tỷ lệ chia doanh thu
alter table courses add column if not exists owner_id uuid references profiles(id) on delete set null;
alter table courses add column if not exists review_status text not null default 'approved'; -- approved|draft|pending|rejected
alter table courses add column if not exists revenue_share int not null default 70;            -- % giảng viên nhận
alter table courses add column if not exists review_note text;
-- Khóa cũ (admin tạo) giữ nguyên hiển thị
update courses set review_status='approved' where review_status is null;

-- 2) Đơn đăng ký làm giảng viên (admin duyệt thủ công)
create table if not exists instructor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text,
  expertise text,
  bio text,
  sample_links text,
  motivation text,
  agree_terms boolean not null default false,
  status text not null default 'pending',  -- pending|approved|rejected
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists uq_instructor_app_user on instructor_applications(user_id);
alter table instructor_applications enable row level security;
drop policy if exists ia_select_own on instructor_applications;
create policy ia_select_own on instructor_applications for select using (auth.uid() = user_id);
drop policy if exists ia_insert_own on instructor_applications;
create policy ia_insert_own on instructor_applications for insert with check (auth.uid() = user_id);
drop policy if exists ia_update_own on instructor_applications;
create policy ia_update_own on instructor_applications for update using (auth.uid() = user_id);

select 'migration-instructor OK' as status;
