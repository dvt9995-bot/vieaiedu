alter table live_sessions add column if not exists reminded_24h boolean not null default false;
select 'remind-24h OK' as status;
