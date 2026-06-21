-- Chạy trong Supabase SQL Editor — Bài tập/dự án có AI chấm điểm.
-- Idempotent: an toàn chạy lại.

-- Đề bài gắn theo khóa (1 bài tập/khóa). null = khóa không có bài tập.
alter table courses add column if not exists assignment_title text;
alter table courses add column if not exists assignment_brief text;   -- đề bài/yêu cầu (markdown)

-- Bài nộp của học viên + kết quả AI chấm
create table if not exists assignment_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  content     text not null,          -- bài làm (văn bản/đường link sản phẩm)
  score       integer,                -- 0..100 do AI chấm
  feedback    text,                   -- nhận xét của AI
  passed      boolean default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_asub_user_course on assignment_submissions(user_id, course_slug, created_at desc);

alter table assignment_submissions enable row level security;
-- Học viên xem bài nộp của CHÍNH MÌNH; ghi do server (service role) thực hiện sau khi AI chấm.
do $$ begin
  create policy "asub select own" on assignment_submissions for select to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
