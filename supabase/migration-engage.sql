-- Tương tác: tags/chủ đề, lượt xem bài & hồ sơ, cá nhân hóa.
alter table posts    add column if not exists tags  text[] not null default '{}';
alter table posts    add column if not exists views integer not null default 0;
alter table profiles add column if not exists interests     text[] not null default '{}';
alter table profiles add column if not exists profile_views integer not null default 0;

-- Tăng lượt xem
create or replace function increment_post_view(p_id uuid) returns void
language sql security definer set search_path = public as $$ update posts set views = views + 1 where id = p_id; $$;
create or replace function increment_profile_view(p_id uuid) returns void
language sql security definer set search_path = public as $$ update profiles set profile_views = profile_views + 1 where id = p_id; $$;
grant execute on function increment_post_view(uuid), increment_profile_view(uuid) to anon, authenticated;

-- Feed kèm tags + views
drop function if exists community_feed(int);
create function community_feed(lim int default 50)
returns table (
  id uuid, body text, image_url text, course_slug text, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text, author_role text,
  owned bigint, likes bigint, comments bigint, tags text[], views integer
)
language sql security definer set search_path = public as $$
  select p.id, p.body, p.image_url, p.course_slug, p.created_at,
    p.author_id, pr.full_name, pr.avatar_url, pr.role,
    (select count(*) from enrollments e where e.user_id = p.author_id),
    (select count(*) from post_likes l where l.post_id = p.id),
    (select count(*) from comments c where c.post_id = p.id),
    p.tags, p.views
  from posts p join profiles pr on pr.id = p.author_id
  where p.hidden = false
  order by p.created_at desc limit lim;
$$;
grant execute on function community_feed(int) to anon, authenticated;

-- Chi tiết 1 bài (công khai)
create or replace function post_detail(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'body', p.body, 'image', p.image_url, 'course_slug', p.course_slug,
    'created_at', p.created_at, 'tags', p.tags, 'views', p.views,
    'author_id', p.author_id, 'author_name', coalesce(pr.full_name,'Học viên'), 'author_role', pr.role,
    'likes', (select count(*) from post_likes l where l.post_id = p.id),
    'comments', (select count(*) from comments c where c.post_id = p.id)
  ) from posts p join profiles pr on pr.id = p.author_id where p.id = p_id and p.hidden = false;
$$;
grant execute on function post_detail(uuid) to anon, authenticated;

-- Bổ sung profile_views + interests vào hồ sơ công khai
create or replace function public_profile(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'id', pr.id, 'name', coalesce(pr.full_name, 'Học viên'), 'avatar', pr.avatar_url, 'bio', pr.bio,
    'role', pr.role, 'code', pr.student_code, 'joined', pr.created_at,
    'profile_views', pr.profile_views, 'interests', pr.interests,
    'courses', (select count(*) from enrollments where user_id = p_id),
    'certificates', (select count(*) from certificates where user_id = p_id),
    'completed', (select count(*) from lesson_progress where user_id = p_id and completed = true),
    'posts', coalesce((
      select json_agg(json_build_object('id', id, 'body', body, 'image', image_url, 'course_slug', course_slug, 'created_at', created_at))
      from (select id, body, image_url, course_slug, created_at from posts where author_id = p_id and hidden = false order by created_at desc limit 20) q
    ), '[]'::json)
  ) from profiles pr where pr.id = p_id;
$$;
grant execute on function public_profile(uuid) to anon, authenticated;
