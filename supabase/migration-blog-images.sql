-- Blog: lưu nhiều ảnh từ nguồn
alter table blog_posts add column if not exists images text[] not null default '{}';
