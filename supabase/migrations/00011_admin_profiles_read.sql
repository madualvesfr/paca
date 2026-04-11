-- Let the app owner's admin dashboard read every profile row so it can
-- render the per-user usage analytics page. Update the email list in
-- lockstep with the usage_stats admin policy.
create policy "profiles_select_admin" on profiles
  for select
  using (
    auth.jwt() ->> 'email' in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com')
  );
