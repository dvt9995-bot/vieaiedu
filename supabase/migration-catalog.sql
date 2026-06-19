-- Chạy trong Supabase SQL Editor — đưa CATALOG khóa học vào DB để quản trị no-code.
-- Sau khi chạy, vào /admin bấm "Nạp dữ liệu mẫu" để seed 6 khóa hiện có.

create table if not exists courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  thumb         text,
  title         text not null,
  subtitle      text,
  description   text,
  category      text,
  level         text not null default 'beginner',     -- beginner|intermediate|advanced
  price         integer not null default 0,
  compare_price integer,
  total_minutes integer not null default 0,
  instructor    text default 'Long Nam',
  what_you_learn text[] default '{}',
  rating        numeric(2,1) default 5.0,
  rating_count  integer default 0,
  students      integer default 0,
  likes         integer default 0,
  status        text not null default 'published',     -- draft|published|archived
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists sections (
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title     text not null,
  position  integer not null default 0
);

create table if not exists lessons (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references sections(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  title        text not null,
  type         text not null default 'video',
  duration_sec integer not null default 0,
  is_preview   boolean not null default false,
  video_id     text,
  content      text,
  position     integer not null default 0
);
create index if not exists idx_sections_course on sections(course_id);
create index if not exists idx_lessons_course on lessons(course_id);

alter table courses  enable row level security;
alter table sections enable row level security;
alter table lessons  enable row level security;

-- Đọc công khai khi published (hoặc admin xem tất cả)
create policy "courses read"  on courses  for select using (status = 'published' or is_admin());
create policy "sections read" on sections for select using (exists(select 1 from courses c where c.id=course_id and (c.status='published' or is_admin())));
create policy "lessons read"  on lessons  for select using (exists(select 1 from courses c where c.id=course_id and (c.status='published' or is_admin())));
-- Ghi: chỉ admin (API admin dùng service role nên cũng qua được)
create policy "courses write"  on courses  for all using (is_admin()) with check (is_admin());
create policy "sections write" on sections for all using (is_admin()) with check (is_admin());
create policy "lessons write"  on lessons  for all using (is_admin()) with check (is_admin());
