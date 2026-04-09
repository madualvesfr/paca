-- Add language preference to profiles
alter table profiles add column language text not null default 'en'
  check (language in ('en', 'pt', 'ru'));
