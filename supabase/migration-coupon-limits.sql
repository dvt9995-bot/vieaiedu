-- Chạy trong Supabase SQL Editor — giới hạn lượt dùng mã giảm giá.
-- An toàn chạy lại nhiều lần (idempotent).

alter table coupons add column if not exists max_uses   integer;          -- null = không giới hạn
alter table coupons add column if not exists used_count integer not null default 0;

-- Lưu mã giảm giá đã áp vào đơn để đếm lượt dùng khi thanh toán thành công
alter table orders  add column if not exists coupon_code text;

-- Tăng lượt dùng có kiểm tra trần (atomic, chống vượt quá max_uses)
create or replace function increment_coupon_use(p_code text)
returns void language sql security definer as $$
  update coupons
     set used_count = used_count + 1
   where code = upper(p_code)
     and (max_uses is null or used_count < max_uses);
$$;
