-- Nâng cấp cộng đồng: chia sẻ khóa + social proof.
alter table posts add column if not exists course_slug text;

-- Feed kèm thông tin tác giả + social proof (số khóa sở hữu) — security definer để đọc enrollment người khác an toàn
create or replace function community_feed(lim int default 50)
returns table (
  id uuid, body text, image_url text, course_slug text, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text, author_role text,
  owned bigint, likes bigint, comments bigint
)
language sql security definer set search_path = public as $$
  select p.id, p.body, p.image_url, p.course_slug, p.created_at,
    p.author_id, pr.full_name, pr.avatar_url, pr.role,
    (select count(*) from enrollments e where e.user_id = p.author_id),
    (select count(*) from post_likes l where l.post_id = p.id),
    (select count(*) from comments c where c.post_id = p.id)
  from posts p join profiles pr on pr.id = p.author_id
  order by p.created_at desc limit lim;
$$;
grant execute on function community_feed(int) to anon, authenticated;

-- Số liệu tổng cho dải social proof
create or replace function community_stats()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'students', (select count(*) from profiles),
    'enrollments', (select count(*) from enrollments),
    'certificates', (select count(*) from certificates),
    'posts', (select count(*) from posts)
  );
$$;
grant execute on function community_stats() to anon, authenticated;
