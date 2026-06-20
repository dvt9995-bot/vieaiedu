-- Blog tự động: thêm trường nguồn + index.
alter table blog_posts add column if not exists source_url  text;
alter table blog_posts add column if not exists source_name text;
create unique index if not exists idx_blog_source on blog_posts(source_url) where source_url is not null;
create index if not exists idx_blog_published on blog_posts(published, published_at desc);
