-- FIX: Đăng ký mới lỗi "Database error creating new user" + upload ảnh thất bại
-- Nguyên nhân: handle_new_user (SECURITY DEFINER) không đặt search_path nên khi GoTrue
-- (role supabase_auth_admin) kích hoạt trigger, hàm gen_student_code() không phân giải được.
alter function public.handle_new_user() set search_path = public, auth;
alter function public.gen_student_code() set search_path = public;

-- Tăng giới hạn dung lượng ảnh để không âm thầm rớt ảnh chụp từ điện thoại (>5MB)
update storage.buckets set file_size_limit = 10485760 where id in ('community', 'avatars', 'blog');
