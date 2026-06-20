-- Email marketing tự động: cờ tránh gửi lặp
alter table orders   add column if not exists reminded_at timestamptz;
alter table profiles add column if not exists nudged_at   timestamptz;
