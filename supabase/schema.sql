-- ============================================================
-- VIE AI EDU — Database schema (Supabase / PostgreSQL) — v2
-- Kiến trúc: DANH MỤC khóa học giữ trong code (src/lib/mock.ts),
-- Supabase lưu DỮ LIỆU NGƯỜI DÙNG. Khóa tham chiếu bằng course_slug (text).
-- Bật RLS toàn bộ. Tiền: VND (integer).
-- Chạy file này trong Supabase SQL Editor.
-- ============================================================
create extension if not exists "pgcrypto";

do $$ begin create type user_role as enum ('student','instructor','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('pending','paid','failed','refunded'); exception when duplicate_object then null; end $$;

-- PROFILES (1-1 với auth.users)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  role       user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- ENROLLMENTS — sở hữu khóa (truy cập trọn đời)
create table if not exists enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, course_slug)
);

-- ORDERS — thanh toán SePay
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  amount      integer not null,
  status      order_status not null default 'pending',
  sepay_ref   text,                 -- nội dung chuyển khoản / mã giao dịch đối soát
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_ref  on orders(sepay_ref);

-- PROGRESS — tiến độ theo bài (lesson_id là id trong catalog code)
create table if not exists lesson_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  course_slug       text not null,
  lesson_id         text not null,
  completed         boolean not null default false,
  last_position_sec integer not null default 0,
  updated_at        timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- NOTES — ghi chú theo mốc video
create table if not exists notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  lesson_id     text not null,
  timestamp_sec integer not null default 0,
  body          text not null,
  created_at    timestamptz not null default now()
);

-- QUIZ ATTEMPTS
create table if not exists quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  quiz_key   text not null,
  score      integer not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);

-- CERTIFICATES — chứng chỉ có mã xác thực công khai
create table if not exists certificates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  code        text unique not null default encode(gen_random_bytes(6),'hex'),
  issued_at   timestamptz not null default now(),
  unique (user_id, course_slug)
);

-- FAVORITES — nút ★ yêu thích
create table if not exists favorites (
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, course_slug)
);

-- REVIEWS
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  course_slug text not null,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (user_id, course_slug)
);

-- COMMUNITY
create table if not exists posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  image_url  text,
  created_at timestamptz not null default now()
);
create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles        enable row level security;
alter table enrollments     enable row level security;
alter table orders          enable row level security;
alter table lesson_progress enable row level security;
alter table notes           enable row level security;
alter table quiz_attempts   enable row level security;
alter table certificates    enable row level security;
alter table favorites       enable row level security;
alter table reviews         enable row level security;
alter table posts           enable row level security;
alter table post_likes      enable row level security;
alter table comments        enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profiles read"   on profiles for select using (true);
create policy "profiles update" on profiles for update using (auth.uid() = id);

create policy "enroll read"   on enrollments for select using (auth.uid() = user_id or is_admin());
-- LƯU Ý: KHÔNG cho client tự insert enrollment. Chỉ webhook SePay (service role) tạo.
create policy "orders read"   on orders for select using (auth.uid() = user_id or is_admin());
create policy "orders insert" on orders for insert with check (auth.uid() = user_id);

create policy "progress own" on lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes own"    on notes           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts own" on quiz_attempts   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fav own"      on favorites       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cert read"    on certificates    for select using (true); -- xác thực công khai bằng code
create policy "reviews read" on reviews for select using (true);
create policy "reviews own"  on reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "posts read"   on posts for select using (true);
create policy "posts own"    on posts for all using (auth.uid() = author_id or is_admin()) with check (auth.uid() = author_id);
create policy "likes read"   on post_likes for select using (true);
create policy "likes own"    on post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments read" on comments for select using (true);
create policy "comments own"  on comments for all using (auth.uid() = author_id or is_admin()) with check (auth.uid() = author_id);

-- Tự tạo profile khi đăng ký
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
