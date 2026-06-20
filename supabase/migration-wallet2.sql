alter table orders add column if not exists wallet_used integer not null default 0;
