-- Thích & bình luận cho bài tin tức (blog)
create table if not exists blog_likes (
  post_id uuid not null references blog_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table blog_likes enable row level security;
do $$ begin create policy "blog_likes read" on blog_likes for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "blog_likes own" on blog_likes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id); exception when duplicate_object then null; end $$;

create table if not exists blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references blog_posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table blog_comments enable row level security;
do $$ begin create policy "blog_comments read" on blog_comments for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "blog_comments insert own" on blog_comments for insert to authenticated with check (auth.uid() = author_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "blog_comments delete own" on blog_comments for delete to authenticated using (auth.uid() = author_id); exception when duplicate_object then null; end $$;

-- Số liệu thích/bình luận cho 1 bài (security definer: đọc công khai)
create or replace function blog_stats(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'likes', (select count(*) from blog_likes where post_id = p_id),
    'comments', (select count(*) from blog_comments where post_id = p_id)
  );
$$;
grant execute on function blog_stats(uuid) to anon, authenticated;
