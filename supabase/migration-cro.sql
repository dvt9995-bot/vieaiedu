-- Tối ưu chuyển đổi landing: thông tin giảng viên, FAQ, cam kết + đánh giá nổi bật
alter table courses add column if not exists instructor_bio text;
alter table courses add column if not exists instructor_avatar text;
alter table courses add column if not exists faq jsonb;        -- [{q,a}]
alter table courses add column if not exists guarantee text;   -- cam kết/đảm bảo (tùy chọn)

create table if not exists course_testimonials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  avatar_url text,
  role text,            -- vd "Học viên K1", "Chủ shop online"
  content text not null,
  rating int not null default 5,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ix_testimonials_course on course_testimonials(course_id);
alter table course_testimonials enable row level security;
-- ai cũng đọc được (social proof công khai)
drop policy if exists ct_read on course_testimonials;
create policy ct_read on course_testimonials for select using (true);

select 'migration-cro OK' as status;
