-- Per-couple subscription / entitlement (M1 Cobrança).
--
-- Subscription is PER COUPLE: one partner pays, both become Premium. Entitlement
-- lives in its OWN table (not on couples) for a security reason: the couples
-- UPDATE policy is `using (id = get_my_couple_id())` with no per-column check, so
-- a client could otherwise self-grant Premium by updating couples. Here, there is
-- NO insert/update/delete policy for clients — only SELECT — so the entitlement
-- can only be written by the RevenueCat webhook via the service_role key (which
-- bypasses RLS). Clients can read their couple's row but never change it.
--
-- Reversible: drop table subscriptions cascade; drop trigger/function;
--             alter publication supabase_realtime drop table subscriptions.

create table subscriptions (
  couple_id uuid primary key references couples(id) on delete cascade,
  -- free = never paid; trialing = in RevenueCat free trial; active = paid & current;
  -- expired = was premium, lapsed. is_premium below derives entitlement from this.
  status text not null default 'free'
    check (status in ('free', 'trialing', 'active', 'expired')),
  plan text check (plan in ('monthly', 'annual')),
  -- Derived entitlement flag for trivial client/RLS/edge-function checks.
  is_premium boolean generated always as (status in ('trialing', 'active')) stored,
  current_period_end timestamptz,
  trial_end timestamptz,
  -- RevenueCat linkage (set/updated by the webhook).
  rc_app_user_id text,
  rc_entitlement text,
  rc_last_event_id text, -- idempotency: skip already-processed RC events
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Both partners can READ their couple's subscription. No write policy exists, so
-- only the service_role (RevenueCat webhook) can insert/update it.
create policy "Couple members can view their subscription"
  on subscriptions for select
  using (couple_id = get_my_couple_id());

-- Keep updated_at fresh on every write (reuses the existing helper from 00001).
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function update_updated_at();

-- Every couple must have a subscription row. Auto-create a free one when a couple
-- is created (security definer so it bypasses the no-insert RLS for the client).
create or replace function create_free_subscription_for_couple()
returns trigger as $$
begin
  insert into subscriptions (couple_id) values (new.id)
    on conflict (couple_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger couples_create_subscription after insert on couples
  for each row execute function create_free_subscription_for_couple();

-- Backfill existing couples with a free subscription.
insert into subscriptions (couple_id)
  select id from couples
  on conflict (couple_id) do nothing;

-- Push entitlement changes to both partners instantly (couples is NOT in the
-- realtime publication, so without this a partner could see stale Free for ~5 min).
alter publication supabase_realtime add table subscriptions;
