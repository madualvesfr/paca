-- Event log of user actions that either cost money (AI) or are the
-- core product value (manual transactions). Used for the admin
-- analytics dashboard before we decide free-tier limits.

create type usage_action as enum (
  'scan_receipt',
  'scan_statement',
  'advise',
  'transaction_added'
);

create table usage_stats (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  action usage_action not null,
  metadata jsonb,
  tokens_estimate int,
  created_at timestamptz not null default now()
);

create index usage_stats_profile_created_idx on usage_stats (profile_id, created_at desc);
create index usage_stats_action_created_idx on usage_stats (action, created_at desc);
create index usage_stats_created_idx on usage_stats (created_at desc);

alter table usage_stats enable row level security;

-- Users can insert their own rows (for client-side manual transaction logs)
create policy "usage_stats_insert_own" on usage_stats
  for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- Users can read their own rows (we might expose this later)
create policy "usage_stats_select_own" on usage_stats
  for select
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- Admin (hardcoded email) can read everything for the dashboard.
-- Update this list if the app's owner email changes.
create policy "usage_stats_select_admin" on usage_stats
  for select
  using (
    auth.jwt() ->> 'email' in ('madualvesfr@icloud.com', 'madualvesfr@gmail.com')
  );
