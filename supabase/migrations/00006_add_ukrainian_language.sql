-- Add Ukrainian language option
alter table profiles drop constraint profiles_language_check;
alter table profiles add constraint profiles_language_check check (language in ('en', 'pt', 'ru', 'uk'));
