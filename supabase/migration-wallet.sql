-- Ví 2 loại tiền: credit (khuyến mãi, chỉ mua khóa) + real (tiền/hoa hồng thật)
alter table profiles add column if not exists credit_balance integer not null default 0;
alter table profiles add column if not exists real_balance   integer not null default 0;

create table if not exists wallet_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('credit','real')),
  amount     integer not null,            -- dương = cộng, âm = trừ
  reason     text,
  ref_order  uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_user on wallet_transactions(user_id, created_at desc);
alter table wallet_transactions enable row level security;
do $$ begin
  create policy "wallet read own" on wallet_transactions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Cộng/trừ ví an toàn (atomic), ghi log. delta>0 cộng, <0 trừ (không cho âm số dư).
create or replace function wallet_change(p_user uuid, p_kind text, p_delta integer, p_reason text, p_order uuid default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if p_kind = 'credit' then select credit_balance into cur from profiles where id = p_user for update;
  else select real_balance into cur from profiles where id = p_user for update; end if;
  if cur is null then return false; end if;
  if p_delta < 0 and cur + p_delta < 0 then return false; end if;
  if p_kind = 'credit' then update profiles set credit_balance = credit_balance + p_delta where id = p_user;
  else update profiles set real_balance = real_balance + p_delta where id = p_user; end if;
  insert into wallet_transactions(user_id, kind, amount, reason, ref_order) values (p_user, p_kind, p_delta, p_reason, p_order);
  return true;
end $$;
grant execute on function wallet_change(uuid, text, integer, text, uuid) to service_role;
