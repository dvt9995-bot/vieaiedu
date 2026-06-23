-- ===== Khóa học LIVE qua Google Meet =====
-- 1) Khóa: phân loại video/live + sức chứa mỗi lớp
alter table courses add column if not exists format text not null default 'video'; -- video|live
alter table courses add column if not exists capacity int;                          -- số chỗ tối đa (live), null=không giới hạn

-- 2) Buổi học (1 khóa live → nhiều buổi do giảng viên chọn)
create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text,
  starts_at timestamptz not null,
  duration_min int not null default 90,
  meet_url text,                 -- link Google Meet (tự sinh hoặc dán tay)
  calendar_event_id text,        -- id sự kiện Google Calendar (để cập nhật/hủy)
  recording_url text,            -- link ghi hình sau buổi (tùy chọn)
  position int not null default 0,
  reminded_1h boolean not null default false,
  reminded_10m boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ix_live_sessions_course on live_sessions(course_id);
create index if not exists ix_live_sessions_start on live_sessions(starts_at);
-- meet_url là nhạy cảm → KHÔNG mở RLS public; chỉ truy cập qua API (service role) có kiểm soát ghi danh + khung giờ
alter table live_sessions enable row level security;

select 'migration-live OK' as status;
