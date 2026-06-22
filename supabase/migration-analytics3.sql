-- Số người đang trực tuyến (hoạt động trong 5 phút) + reload cache PostgREST.
create or replace function online_now()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'online',        (select count(distinct anon_id) from analytics_events where created_at >= now()-interval '5 minutes' and anon_id is not null),
    'online_users',  (select count(distinct user_id) from analytics_events where created_at >= now()-interval '5 minutes' and user_id is not null),
    'today_visits',  (select count(*) from analytics_events where event='pageview' and created_at::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date)
  );
$$;
-- bắt PostgREST tải lại schema để thấy hàm mới ngay
notify pgrst, 'reload schema';
