-- ============ SÀN TMĐT (Marketplace) ============
-- Danh mục + phí sàn theo danh mục
create table if not exists shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  fee_percent numeric not null default 10,   -- phí sàn % theo danh mục
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Shop của người bán (1 user 1 shop)
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  status text not null default 'pending',  -- pending|approved|suspended
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists uq_shops_owner on shops(owner_id);
alter table shops enable row level security;
drop policy if exists shops_read on shops; create policy shops_read on shops for select using (true);

-- Sản phẩm (số / vật lý)
create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  type text not null default 'digital',      -- digital|physical
  title text not null,
  slug text unique not null,
  description text,
  price int not null default 0,
  compare_price int,
  category_id uuid references shop_categories(id) on delete set null,
  stock int,                                 -- vật lý: tồn kho; null = không giới hạn (số)
  media jsonb,                               -- ["url1","url2"]
  options jsonb,                             -- biến thể: [{name:"Size",values:["S","M"]}]
  digital_url text,                          -- sản phẩm số: file/link giao
  digital_note text,                         -- hướng dẫn/license
  shipping_fee int not null default 0,       -- vật lý: phí ship phẳng
  status text not null default 'draft',      -- draft|published
  review_status text not null default 'pending', -- pending|approved|rejected
  review_note text,
  sold_count int not null default 0,
  rating numeric not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ix_products_shop on shop_products(shop_id);
create index if not exists ix_products_cat on shop_products(category_id);
alter table shop_products enable row level security;
drop policy if exists products_read on shop_products; create policy products_read on shop_products for select using (true);

-- Giỏ hàng
create table if not exists shop_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references shop_products(id) on delete cascade,
  qty int not null default 1,
  variant text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_cart on shop_cart_items(user_id, product_id, coalesce(variant,''));
alter table shop_cart_items enable row level security;
drop policy if exists cart_own on shop_cart_items; create policy cart_own on shop_cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Đơn hàng (tách theo shop) + escrow
create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete set null,
  shop_id uuid not null references shops(id) on delete set null,
  code text,                                 -- mã nội dung SePay
  subtotal int not null default 0,
  shipping_fee int not null default 0,
  total int not null default 0,
  fee_percent numeric not null default 10,
  fee_amount int not null default 0,
  seller_amount int not null default 0,      -- tiền người bán nhận sau phí
  status text not null default 'pending',    -- pending|paid|shipped|delivered|completed|cancelled|refunded|disputed
  escrow_status text not null default 'none',-- none|held|released|refunded
  has_physical boolean not null default false,
  ship_name text, ship_phone text, ship_address text,
  tracking_code text, carrier text,
  paid_at timestamptz, release_at timestamptz, shipped_at timestamptz, delivered_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ix_sorders_buyer on shop_orders(buyer_id);
create index if not exists ix_sorders_shop on shop_orders(shop_id);
create index if not exists ix_sorders_status on shop_orders(status, escrow_status);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  product_id uuid references shop_products(id) on delete set null,
  title text, type text, price int not null default 0, qty int not null default 1, variant text,
  digital_url text, digital_note text
);
create index if not exists ix_soitems_order on shop_order_items(order_id);

-- Sổ cái escrow (minh bạch dòng tiền)
create table if not exists escrow_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references shop_orders(id) on delete set null,
  shop_id uuid references shops(id) on delete set null,
  type text not null,                        -- hold|fee|release|refund
  amount int not null,
  note text,
  created_at timestamptz not null default now()
);

-- Đánh giá sản phẩm
create table if not exists shop_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shop_products(id) on delete cascade,
  order_id uuid references shop_orders(id) on delete set null,
  buyer_id uuid not null references profiles(id) on delete cascade,
  rating int not null default 5,
  body text,
  created_at timestamptz not null default now()
);
create index if not exists ix_sreviews_product on shop_reviews(product_id);
alter table shop_reviews enable row level security;
drop policy if exists sreviews_read on shop_reviews; create policy sreviews_read on shop_reviews for select using (true);

-- Khiếu nại / tranh chấp
create table if not exists shop_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open',       -- open|resolved_refund|resolved_release
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists ix_disputes_status on shop_disputes(status);

-- Danh mục mặc định
insert into shop_categories (name, slug, fee_percent, position) values
  ('Khóa học & Tài liệu số','tai-lieu-so',10,1),
  ('Phần mềm & Công cụ AI','phan-mem-ai',12,2),
  ('Template & Thiết kế','template-thiet-ke',12,3),
  ('Sản phẩm vật lý','san-pham-vat-ly',8,4),
  ('Dịch vụ','dich-vu',15,5)
on conflict (slug) do nothing;

select 'migration-shop OK' as status;

-- Nhắc đơn chưa thanh toán (cron reminders)
alter table shop_orders add column if not exists reminded_at timestamptz;
