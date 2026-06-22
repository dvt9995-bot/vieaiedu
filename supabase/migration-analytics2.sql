-- Bổ sung phiên + chỉ số engagement cho Marketing Dashboard.
alter table analytics_events add column if not exists session_id text;
create index if not exists idx_ae_session on analytics_events(session_id);

create or replace function marketing_overview(days int default 30)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'days', days,
    'visits',      (select count(*) from analytics_events where event='pageview' and created_at >= now()-(days||' days')::interval),
    'uniques',     (select count(distinct anon_id) from analytics_events where event='pageview' and created_at >= now()-(days||' days')::interval),
    'active7',     (select count(distinct user_id) from analytics_events where user_id is not null and created_at >= now()-interval '7 days'),
    'signups',     (select count(*) from profiles where created_at >= now()-(days||' days')::interval),
    'enrollments', (select count(*) from enrollments where created_at >= now()-(days||' days')::interval),
    'paid',        (select count(*) from orders where status='paid' and paid_at >= now()-(days||' days')::interval),
    'revenue',     (select coalesce(sum(amount+coalesce(wallet_used,0)),0) from orders where status='paid' and paid_at >= now()-(days||' days')::interval),
    'total_users', (select count(*) from profiles),
    -- ENGAGEMENT
    'sessions',    (select count(distinct session_id) from analytics_events where event='pageview' and session_id is not null and created_at >= now()-(days||' days')::interval),
    'bounce_rate', (select case when count(*)>0 then round(100.0*count(*) filter (where c=1)/count(*)) else 0 end
                      from (select session_id, count(*) c from analytics_events where event='pageview' and session_id is not null and created_at>=now()-(days||' days')::interval group by session_id) s),
    'pages_per_session', (select case when count(distinct session_id)>0 then round(count(*)::numeric/count(distinct session_id),1) else 0 end
                            from analytics_events where event='pageview' and session_id is not null and created_at>=now()-(days||' days')::interval),
    'avg_dwell_sec', (select coalesce(round(avg((props->>'ms')::numeric)/1000),0) from analytics_events where event='dwell' and created_at>=now()-(days||' days')::interval and (props->>'ms') ~ '^[0-9]+$'),
    'avg_session_sec', (select coalesce(round(avg(dur)),0) from (select session_id, extract(epoch from (max(created_at)-min(created_at))) dur from analytics_events where session_id is not null and created_at>=now()-(days||' days')::interval group by session_id) z),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',to_char(d,'YYYY-MM-DD'),'visits',v,'signups',s) order by d),'[]'::jsonb) from (
        select g::date d,
          (select count(*) from analytics_events e where e.event='pageview' and e.created_at::date=g::date) v,
          (select count(*) from profiles p where p.created_at::date=g::date) s
        from generate_series(now()::date-((days-1)||' days')::interval, now()::date, interval '1 day') g) x),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path',path,'n',n)),'[]'::jsonb) from (
        select path, count(*) n from analytics_events where event='pageview' and path is not null and created_at>=now()-(days||' days')::interval group by path order by n desc limit 8) y),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('ref',ref,'n',n)),'[]'::jsonb) from (
        select coalesce(nullif(ref,''),'(trực tiếp)') ref, count(*) n from analytics_events where event='pageview' and created_at>=now()-(days||' days')::interval group by 1 order by n desc limit 8) z2),
    'top_clicks', (select coalesce(jsonb_agg(jsonb_build_object('label',label,'n',n)),'[]'::jsonb) from (
        select props->>'label' label, count(*) n from analytics_events where event='click' and created_at>=now()-(days||' days')::interval and props->>'label' is not null group by 1 order by n desc limit 10) cl),
    'top_courses', (select coalesce(jsonb_agg(jsonb_build_object('slug',course_slug,'n',n)),'[]'::jsonb) from (
        select course_slug, count(*) n from enrollments group by course_slug order by n desc limit 8) v2)
  );
$$;
