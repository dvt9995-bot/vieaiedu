-- Chạy trong Supabase SQL Editor — mã giảm giá.
create table if not exists coupons (
  code        text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table coupons enable row level security;
-- Không policy public: chỉ server (service role) đọc/ghi khi validate. Admin tạo coupon qua SQL hoặc bổ sung UI sau.

-- Ví dụ tạo mã: giảm 30%, còn hạn
-- insert into coupons(code,percent_off,expires_at) values ('VIE30',30, now()+interval '30 days');
