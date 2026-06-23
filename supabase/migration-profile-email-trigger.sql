-- Gốc rễ: trigger tạo profile khi đăng ký KHÔNG copy email → profiles.email trống.
-- 1) Vá trigger: thêm email vào insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public','auth' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, student_code, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', gen_student_code(), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

-- 2) Đồng bộ khi user xác nhận/đổi email
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path to 'public','auth' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change after update of email on auth.users for each row execute function public.sync_profile_email();

-- 3) Backfill toàn bộ profile đang trống email
update public.profiles p set email = au.email
from auth.users au
where p.id = au.id and (p.email is null or trim(p.email) = '') and au.email is not null;

select 'profile email fix OK' as status, (select count(*) from public.profiles where email is null or trim(email)='') as still_missing;
