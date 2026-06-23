-- Thông báo cho CHỦ BÀI khi có người like / bình luận bài cộng đồng (in-app + realtime).
create or replace function notify_post_like() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; actor text;
begin
  select author_id into owner from posts where id = NEW.post_id;
  if owner is null or owner = NEW.user_id then return NEW; end if;     -- không tự thông báo chính mình
  select coalesce(nullif(trim(full_name),''),'Một học viên') into actor from profiles where id = NEW.user_id;
  insert into notifications(user_id, title, body, href)
    values (owner, '❤️ ' || actor || ' đã thích bài viết của bạn', null, '/p/' || NEW.post_id);
  return NEW;
end $$;
drop trigger if exists trg_notify_post_like on post_likes;
create trigger trg_notify_post_like after insert on post_likes for each row execute function notify_post_like();

create or replace function notify_post_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; actor text;
begin
  select author_id into owner from posts where id = NEW.post_id;
  if owner is null or owner = NEW.author_id then return NEW; end if;
  select coalesce(nullif(trim(full_name),''),'Một học viên') into actor from profiles where id = NEW.author_id;
  insert into notifications(user_id, title, body, href)
    values (owner, '💬 ' || actor || ' đã bình luận bài viết của bạn', left(NEW.body, 140), '/p/' || NEW.post_id);
  return NEW;
end $$;
drop trigger if exists trg_notify_post_comment on comments;
create trigger trg_notify_post_comment after insert on comments for each row execute function notify_post_comment();
