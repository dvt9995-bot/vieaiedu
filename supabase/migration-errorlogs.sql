-- Nhật ký lỗi giao diện (cho panel "Cần xử lý" + theo dõi)
create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  message text,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_error_logs_created on error_logs(created_at desc);
alter table error_logs enable row level security; -- chỉ service-role đọc/ghi
