-- Admin Control nâng cao: settings + RPC dashboard + coupon RLS đọc cho admin.

-- Cấu hình ứng dụng (key-value). Chỉ admin đọc/ghi; server dùng service role bỏ qua RLS.
create table if not exists app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
create policy "settings admin" on app_settings for all using (is_admin()) with check (is_admin());

-- RPC: doanh thu theo ngày (đơn đã thanh toán)
create or replace function revenue_by_day(days int default 30)
returns table (d date, total bigint)
language sql security definer set search_path = public as $$
  select date_trunc('day', paid_at)::date as d, sum(amount)::bigint as total
  from orders where status = 'paid' and paid_at > now() - (days || ' days')::interval
  group by 1 order by 1;
$$;

-- RPC: đăng ký theo ngày
create or replace function signups_by_day(days int default 30)
returns table (d date, total bigint)
language sql security definer set search_path = public as $$
  select date_trunc('day', created_at)::date as d, count(*)::bigint as total
  from profiles where created_at > now() - (days || ' days')::interval
  group by 1 order by 1;
$$;

-- RPC: top khóa theo số ghi danh
create or replace function top_courses()
returns table (course_slug text, students bigint)
language sql security definer set search_path = public as $$
  select course_slug, count(*)::bigint as students
  from enrollments group by course_slug order by students desc limit 10;
$$;

-- RPC: tổng quan nhanh
create or replace function admin_overview()
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'revenue', coalesce((select sum(amount) from orders where status='paid'),0),
    'revenue_month', coalesce((select sum(amount) from orders where status='paid' and paid_at > date_trunc('month', now())),0),
    'students', (select count(*) from profiles),
    'enrollments', (select count(*) from enrollments),
    'orders_paid', (select count(*) from orders where status='paid'),
    'completion_rate', coalesce((select round(100.0 * count(*) filter (where completed) / nullif(count(*),0)) from lesson_progress),0)
  );
$$;

grant execute on function revenue_by_day(int), signups_by_day(int), top_courses(), admin_overview() to authenticated, service_role;

-- Cho phép coupon admin đọc/ghi (đã có bảng từ migration-coupons)
do $$ begin
  create policy "coupons admin" on coupons for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;
