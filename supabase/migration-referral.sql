-- Chương trình giới thiệu
alter table profiles add column if not exists referred_by    uuid references profiles(id);
alter table profiles add column if not exists referral_count integer not null default 0;
