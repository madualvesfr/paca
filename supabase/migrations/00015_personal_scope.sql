-- Personal vs Couple scope (Phase 1: schema only)
-- Adds a `finance_scope` enum so transactions, budgets, and categories can be
-- marked as personal (owned by one profile and invisible to the partner) while
-- staying anchored to the same couple_id. Existing rows default to 'couple' so
-- behavior is identical until Phase 2 (RLS rewrite) ships.

-- 1) Enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'finance_scope') then
    create type finance_scope as enum ('couple', 'personal');
  end if;
end $$;

-- 2) Transactions: reuse existing paid_by as owner when scope='personal'
alter table transactions
  add column if not exists scope finance_scope;

update transactions set scope = 'couple' where scope is null;

alter table transactions
  alter column scope set not null,
  alter column scope set default 'couple';

-- 3) Budgets: needs explicit owner_id (no paid_by here)
alter table budgets
  add column if not exists scope finance_scope,
  add column if not exists owner_id uuid references profiles(id) on delete cascade;

update budgets set scope = 'couple' where scope is null;

alter table budgets
  alter column scope set not null,
  alter column scope set default 'couple';

alter table budgets
  drop constraint if exists budgets_personal_owner_required;
alter table budgets
  add constraint budgets_personal_owner_required
    check (scope = 'couple' or owner_id is not null);

-- Replace single unique (couple_id, month) with two partial unique indexes
alter table budgets drop constraint if exists budgets_couple_id_month_key;
create unique index if not exists budgets_couple_month_unique
  on budgets (couple_id, month) where scope = 'couple';
create unique index if not exists budgets_personal_owner_month_unique
  on budgets (owner_id, month) where scope = 'personal';

-- 4) Categories
alter table categories
  add column if not exists scope finance_scope not null default 'couple',
  add column if not exists owner_id uuid references profiles(id) on delete cascade;

alter table categories
  drop constraint if exists categories_personal_owner_required;
alter table categories
  add constraint categories_personal_owner_required
    check (scope = 'couple' or owner_id is not null);

-- 5) Partial indexes for the personal branch of RLS OR'd policies (Phase 2).
-- The personal branch filters on owner profile id (paid_by for transactions,
-- owner_id for budgets/categories), so a partial index keeps lookups cheap.
create index if not exists idx_transactions_personal_owner
  on transactions (paid_by, date desc) where scope = 'personal';
create index if not exists idx_transactions_couple_date_v2
  on transactions (couple_id, date desc) where scope = 'couple';
create index if not exists idx_budgets_personal_owner_month
  on budgets (owner_id, month) where scope = 'personal';
create index if not exists idx_categories_personal_owner
  on categories (owner_id) where scope = 'personal';
