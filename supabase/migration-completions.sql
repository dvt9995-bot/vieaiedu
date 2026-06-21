-- Ghi nhận hoàn thành khóa (để xét điều kiện cấp chứng chỉ: tối thiểu 5 khóa trả phí)
create table if not exists course_completions (
  user_id      uuid not null references profiles(id) on delete cascade,
  course_slug  text not null,
  paid         boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_slug)
);
alter table course_completions enable row level security;
do $$ begin
  create policy "course_completions read own" on course_completions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
