-- AI auto-SEO: lưu tiêu đề & mô tả SEO do AI tối ưu cho khóa học
alter table courses add column if not exists seo_title       text;
alter table courses add column if not exists seo_description text;
