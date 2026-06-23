-- Tự động ghi hình buổi live: trạng thái xử lý bản ghi
alter table live_sessions add column if not exists recording_status text; -- null|processing|ready|failed
select 'migration-live-recording OK' as status;
