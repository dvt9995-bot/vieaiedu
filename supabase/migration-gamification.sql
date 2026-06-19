-- Chạy trong Supabase SQL Editor — Thông báo + Bảng xếp hạng.

-- THÔNG BÁO
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  body       text,
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, read);
alter table notifications enable row level security;
create policy "notif own" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BẢNG XẾP HẠNG (top học viên theo số bài hoàn thành) — RPC bỏ qua RLS
create or replace function leaderboard()
returns table (user_id uuid, full_name text, avatar_url text, completed bigint)
language sql security definer set search_path = public as $$
  select lp.user_id, p.full_name, p.avatar_url, count(*) as completed
  from lesson_progress lp
  join profiles p on p.id = lp.user_id
  where lp.completed = true
  group by lp.user_id, p.full_name, p.avatar_url
  order by completed desc
  limit 20;
$$;
grant execute on function leaderboard() to anon, authenticated;
