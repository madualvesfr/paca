-- "Should I buy this?" advisor feature.
-- Stores each time the user consults the AI about a potential purchase,
-- along with the computed verdict and the Gemini-written reasoning.
-- Private by default; partner sees a consult only when is_shared = true.

create type advice_verdict as enum ('go', 'wait', 'avoid');
create type advice_urgency as enum ('now', 'this_month', 'just_thinking');

create table purchase_advice (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  asked_by uuid not null references profiles(id) on delete cascade,
  item text not null,
  amount bigint not null check (amount > 0),           -- in cents, couple primary currency
  currency char(3) not null default 'BRL',
  original_amount bigint,                               -- what the user typed
  original_currency char(3),
  exchange_rate numeric(18, 8),
  category_id uuid references categories(id) on delete set null,
  urgency advice_urgency not null default 'now',
  notes text,
  is_shared boolean not null default false,             -- visible to partner?
  verdict advice_verdict not null,                      -- computed server-side
  reasoning text not null,                              -- natural language
  impact jsonb,                                         -- { new_balance, budget_usage_after, ... }
  alternatives text,
  created_at timestamptz default now()
);

create index purchase_advice_couple_id_idx on purchase_advice (couple_id, created_at desc);
create index purchase_advice_asked_by_idx on purchase_advice (asked_by, created_at desc);

alter table purchase_advice enable row level security;

create policy "purchase_advice_select" on purchase_advice
  for select
  using (
    asked_by in (select id from profiles where user_id = auth.uid())
    or (
      is_shared = true
      and couple_id in (
        select couple_id from profiles where user_id = auth.uid() and couple_id is not null
      )
    )
  );

create policy "purchase_advice_insert" on purchase_advice
  for insert
  with check (
    asked_by in (select id from profiles where user_id = auth.uid())
    and couple_id in (select couple_id from profiles where user_id = auth.uid() and couple_id is not null)
  );

create policy "purchase_advice_update" on purchase_advice
  for update
  using (asked_by in (select id from profiles where user_id = auth.uid()))
  with check (asked_by in (select id from profiles where user_id = auth.uid()));

create policy "purchase_advice_delete" on purchase_advice
  for delete
  using (asked_by in (select id from profiles where user_id = auth.uid()));
