-- Hệ thống thông báo đầy đủ: prefs, web push, realtime, welcome.

-- Tùy chọn nhận tin (jsonb theo nhóm × kênh; mặc định {} = bật hết)
create table if not exists notification_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  prefs   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table notification_prefs enable row level security;
create policy "prefs own" on notification_prefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Đăng ký Web Push
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
create policy "push own" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bật Realtime cho bảng notifications (chuông tự cập nhật)
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when others then null; end $$;

-- Học viên lâu không vào (cho cron nhắc học): có ghi danh nhưng không có tiến độ mới trong N ngày
create or replace function inactive_learners(days int default 3)
returns table (user_id uuid)
language sql security definer set search_path = public as $$
  select distinct e.user_id from enrollments e
  where not exists (
    select 1 from lesson_progress lp
    where lp.user_id = e.user_id and lp.updated_at > now() - (days || ' days')::interval
  );
$$;
grant execute on function inactive_learners(int) to anon, authenticated, service_role;

-- Welcome notification khi đăng ký (cập nhật trigger)
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.notifications (user_id, title, body, href)
  values (new.id, 'Chào mừng đến với VIE AI EDU 👋', 'Khám phá khóa học AI và bắt đầu hành trình của bạn.', '/courses');
  return new;
end $$;
