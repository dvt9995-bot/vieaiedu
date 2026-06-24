-- Bucket RIÊNG TƯ cho file sản phẩm số (chỉ tải qua link ký có hạn giờ)
insert into storage.buckets (id, name, public, file_size_limit)
values ('shopfiles','shopfiles', false, 524288000)
on conflict (id) do nothing;
select 'shopfiles bucket OK' as status;
