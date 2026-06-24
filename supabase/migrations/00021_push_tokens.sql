-- M3 Retenção: Expo push tokens.
--
-- Tokens live in their OWN table (not on profiles) for safety: a profile row is
-- readable by the partner ("view partner profile" RLS), and anyone holding an
-- Expo push token can send a notification to that device. So tokens are
-- own-access only — the partner cannot read them. The check-budgets function
-- reads them via service_role to send pushes.
--
-- Reversible: drop table push_tokens.

create table push_tokens (
  profile_id uuid primary key references profiles(id) on delete cascade,
  expo_push_token text,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table push_tokens enable row level security;

-- Owner reads/writes only their own token (covers select/insert/update/delete).
create policy "Users manage own push token"
  on push_tokens for all
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create trigger push_tokens_updated_at before update on push_tokens
  for each row execute function update_updated_at();
