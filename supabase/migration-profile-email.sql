-- Lưu email vào profiles để admin đọc được mà không phụ thuộc Auth Admin API (listUsers).
alter table profiles add column if not exists email text;
update profiles p set email = u.email
  from auth.users u where u.id = p.id and (p.email is null or p.email is distinct from u.email);
