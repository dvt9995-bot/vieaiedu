-- Ủng hộ cộng đồng (tùy tâm) — thanh toán qua SePay, tính vào doanh thu.
create table if not exists donations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  amount      integer not null check (amount > 0),
  message     text,
  course_slug text,
  status      text not null default 'pending' check (status in ('pending','paid')),
  sepay_ref   text,
  paid_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_donations_status on donations(status, created_at desc);
alter table donations enable row level security; -- chỉ service-role đọc/ghi
