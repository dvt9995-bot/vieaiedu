-- Quyền Storage: cho học viên đăng nhập tự upload ảnh vào thư mục của mình.
-- (Bucket public đã cho đọc công khai; cần thêm policy INSERT/UPDATE.)

do $$ begin
  create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avatars upload own" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avatars update own" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "community read" on storage.objects for select using (bucket_id = 'community');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "community upload own" on storage.objects for insert to authenticated
    with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "community update own" on storage.objects for update to authenticated
    using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;
