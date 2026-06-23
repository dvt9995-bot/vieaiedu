-- Thư viện ảnh kết quả học viên khóa trước (social proof mạnh)
alter table courses add column if not exists result_images jsonb; -- ["url1","url2",...]
select 'migration-results OK' as status;
