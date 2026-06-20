-- Hồ sơ học viên: thông tin cá nhân + mã học viên.
alter table profiles add column if not exists phone       text;
alter table profiles add column if not exists address     text;
alter table profiles add column if not exists birthdate   date;
alter table profiles add column if not exists bio         text;
alter table profiles add column if not exists student_code text unique;

-- Sinh mã học viên ngẫu nhiên duy nhất: VIE + 2 số năm + 6 số
create or replace function gen_student_code() returns text language plpgsql as $$
declare code text;
begin
  loop
    code := 'VIE' || to_char(now(), 'YY') || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from profiles where student_code = code);
  end loop;
  return code;
end $$;

-- Cấp mã cho học viên cũ chưa có
update profiles set student_code = gen_student_code() where student_code is null;

-- Cấp mã tự động khi tạo hồ sơ mới
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url, student_code)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', gen_student_code())
  on conflict (id) do nothing;
  return new;
end $$;

-- Đảm bảo học viên tự sửa được hồ sơ của mình
do $$ begin
  create policy "profiles update own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
