-- First-party analytics cho Marketing Dashboard.
create table if not exists analytics_events (
  id         bigint generated always as identity primary key,
  anon_id    text,
  user_id    uuid,
  event      text not null,
  path       text,
  ref        text,
  props      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ae_created on analytics_events(created_at desc);
create index if not exists idx_ae_event on analytics_events(event);
create index if not exists idx_ae_anon on analytics_events(anon_id);
alter table analytics_events enable row level security; -- chỉ server (service role) thao tác

-- RPC tổng hợp marketing (trả JSON). days = số ngày gần nhất.
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
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',to_char(d,'YYYY-MM-DD'),'visits',v,'signups',s) order by d),'[]'::jsonb) from (
        select g::date d,
          (select count(*) from analytics_events e where e.event='pageview' and e.created_at::date=g::date) v,
          (select count(*) from profiles p where p.created_at::date=g::date) s
        from generate_series(now()::date-((days-1)||' days')::interval, now()::date, interval '1 day') g) x),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path',path,'n',n)),'[]'::jsonb) from (
        select path, count(*) n from analytics_events where event='pageview' and path is not null and created_at>=now()-(days||' days')::interval group by path order by n desc limit 8) y),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('ref',ref,'n',n)),'[]'::jsonb) from (
        select coalesce(nullif(ref,''),'(trực tiếp)') ref, count(*) n from analytics_events where event='pageview' and created_at>=now()-(days||' days')::interval group by 1 order by n desc limit 8) z),
    'top_events', (select coalesce(jsonb_agg(jsonb_build_object('event',event,'n',n)),'[]'::jsonb) from (
        select event, count(*) n from analytics_events where created_at>=now()-(days||' days')::interval group by event order by n desc limit 10) w),
    'top_courses', (select coalesce(jsonb_agg(jsonb_build_object('slug',course_slug,'n',n)),'[]'::jsonb) from (
        select course_slug, count(*) n from enrollments group by course_slug order by n desc limit 8) v2)
  );
$$;
