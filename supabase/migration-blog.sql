-- Blog (tin tức tự động). Tạo bảng nếu chưa có + trường nguồn.
create table if not exists blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  body         text,
  cover_url    text,
  source_url   text,
  source_name  text,
  published    boolean not null default true,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
alter table blog_posts add column if not exists source_url  text;
alter table blog_posts add column if not exists source_name text;
alter table blog_posts add column if not exists cover_url   text;

alter table blog_posts enable row level security;
do $$ begin
  create policy "blog read published" on blog_posts for select using (published = true or is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "blog admin write" on blog_posts for all using (is_admin()) with check (is_admin());
exception when duplicate_object then null; end $$;

create unique index if not exists idx_blog_source on blog_posts(source_url) where source_url is not null;
create index if not exists idx_blog_published on blog_posts(published, published_at desc);
