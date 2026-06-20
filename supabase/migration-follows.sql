-- Theo dõi người dùng
create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table follows enable row level security;
do $$ begin
  create policy "follows read" on follows for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "follows insert own" on follows for insert to authenticated with check (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "follows delete own" on follows for delete to authenticated using (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

-- Hồ sơ công khai: bổ sung số người theo dõi / đang theo dõi
create or replace function public_profile(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'id', pr.id, 'name', coalesce(pr.full_name, 'Học viên'), 'avatar', pr.avatar_url, 'bio', pr.bio,
    'role', pr.role, 'code', pr.student_code, 'joined', pr.created_at,
    'profile_views', pr.profile_views, 'interests', pr.interests,
    'courses', (select count(*) from enrollments where user_id = p_id),
    'certificates', (select count(*) from certificates where user_id = p_id),
    'completed', (select count(*) from lesson_progress where user_id = p_id and completed = true),
    'followers', (select count(*) from follows where following_id = p_id),
    'following', (select count(*) from follows where follower_id = p_id),
    'posts', coalesce((
      select json_agg(json_build_object('id', id, 'body', body, 'image', image_url, 'course_slug', course_slug, 'created_at', created_at))
      from (select id, body, image_url, course_slug, created_at from posts where author_id = p_id and hidden = false order by created_at desc limit 20) q
    ), '[]'::json)
  ) from profiles pr where pr.id = p_id;
$$;
grant execute on function public_profile(uuid) to anon, authenticated;
