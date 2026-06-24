-- Thông tin phục vụ tự lên đơn vận chuyển (thủ công)
alter table shop_products add column if not exists weight int;       -- cân nặng (gram)
alter table shop_products add column if not exists dimensions text;  -- "D×R×C cm"
alter table shops add column if not exists pickup_name text;         -- người gửi
alter table shops add column if not exists pickup_phone text;        -- SĐT lấy hàng
alter table shops add column if not exists pickup_address text;      -- địa chỉ kho
select 'shop-ship OK' as status;
