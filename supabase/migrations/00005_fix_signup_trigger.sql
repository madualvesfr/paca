-- Fix: update handle_new_user trigger to include language column
-- and set search_path to public (security definer needs explicit schema)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'en'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
