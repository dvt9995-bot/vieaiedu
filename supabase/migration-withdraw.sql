-- Yêu cầu rút tiền từ ví hoa hồng (real_balance)
create table if not exists withdrawals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  amount       integer not null check (amount > 0),
  bank_name    text,
  bank_account text,
  bank_holder  text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  note         text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists idx_withdrawals_status on withdrawals(status, created_at desc);
alter table withdrawals enable row level security;
do $$ begin
  create policy "withdrawals read own" on withdrawals for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
