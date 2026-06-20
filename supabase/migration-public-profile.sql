-- Hồ sơ công khai của học viên (an toàn: chỉ lộ tên/avatar/bio/role + số liệu + bài đăng).
create or replace function public_profile(p_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'id', pr.id,
    'name', coalesce(pr.full_name, 'Học viên'),
    'avatar', pr.avatar_url,
    'bio', pr.bio,
    'role', pr.role,
    'code', pr.student_code,
    'joined', pr.created_at,
    'courses', (select count(*) from enrollments where user_id = p_id),
    'certificates', (select count(*) from certificates where user_id = p_id),
    'completed', (select count(*) from lesson_progress where user_id = p_id and completed = true),
    'posts', coalesce((
      select json_agg(json_build_object('id', id, 'body', body, 'image', image_url, 'course_slug', course_slug, 'created_at', created_at))
      from (select id, body, image_url, course_slug, created_at from posts where author_id = p_id order by created_at desc limit 20) q
    ), '[]'::json)
  )
  from profiles pr where pr.id = p_id;
$$;
grant execute on function public_profile(uuid) to anon, authenticated;
