-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Couples table
create table couples (
  id uuid primary key default uuid_generate_v4(),
  invite_code text unique not null,
  partner_since date default current_date,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Profiles table
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add foreign key from couples.created_by to profiles
alter table couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references profiles(id);

-- Categories table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references couples(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions table
create type transaction_type as enum ('income', 'expense');

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  paid_by uuid not null references profiles(id),
  type transaction_type not null,
  amount bigint not null check (amount > 0),
  description text not null,
  category_id uuid not null references categories(id),
  date date not null default current_date,
  notes text,
  is_recurring boolean default false,
  recurrence_rule text,
  ai_scanned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budgets table
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  month date not null,
  total_amount bigint not null check (total_amount > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (couple_id, month)
);

-- Budget categories table
create table budget_categories (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id),
  allocated_amount bigint not null check (allocated_amount >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (budget_id, category_id)
);

-- Notifications table
create type notification_type as enum ('transaction_added', 'budget_alert', 'goal_reached');

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  target_user_id uuid not null references profiles(id),
  type notification_type not null,
  title text not null,
  body text not null,
  read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_couple_id on profiles(couple_id);
create index idx_transactions_couple_id on transactions(couple_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_category_id on transactions(category_id);
create index idx_budgets_couple_month on budgets(couple_id, month);
create index idx_notifications_target on notifications(target_user_id, read);
create index idx_categories_couple_id on categories(couple_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger couples_updated_at before update on couples
  for each row execute function update_updated_at();

create trigger categories_updated_at before update on categories
  for each row execute function update_updated_at();

create trigger transactions_updated_at before update on transactions
  for each row execute function update_updated_at();

create trigger budgets_updated_at before update on budgets
  for each row execute function update_updated_at();

create trigger budget_categories_updated_at before update on budget_categories
  for each row execute function update_updated_at();

create trigger notifications_updated_at before update on notifications
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table couples enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table budget_categories enable row level security;
alter table notifications enable row level security;

-- Helper: get the couple_id of the current user
create or replace function get_my_couple_id()
returns uuid as $$
  select couple_id from profiles where user_id = auth.uid()
$$ language sql security definer stable;

-- Profiles: can read own and partner's profile
create policy "Users can view own profile"
  on profiles for select
  using (user_id = auth.uid());

create policy "Users can view partner profile"
  on profiles for select
  using (couple_id = get_my_couple_id() and get_my_couple_id() is not null);

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert
  with check (user_id = auth.uid());

-- Couples: can read/update own couple
create policy "Users can view own couple"
  on couples for select
  using (id = get_my_couple_id());

create policy "Users can create couple"
  on couples for insert
  with check (true);

create policy "Users can update own couple"
  on couples for update
  using (id = get_my_couple_id());

-- Categories: can read defaults + own couple's categories
create policy "Users can view default categories"
  on categories for select
  using (is_default = true);

create policy "Users can view couple categories"
  on categories for select
  using (couple_id = get_my_couple_id());

create policy "Users can create couple categories"
  on categories for insert
  with check (couple_id = get_my_couple_id());

create policy "Users can update couple categories"
  on categories for update
  using (couple_id = get_my_couple_id());

create policy "Users can delete couple categories"
  on categories for delete
  using (couple_id = get_my_couple_id() and is_default = false);

-- Transactions: filtered by couple_id
create policy "Users can view couple transactions"
  on transactions for select
  using (couple_id = get_my_couple_id());

create policy "Users can insert couple transactions"
  on transactions for insert
  with check (couple_id = get_my_couple_id());

create policy "Users can update couple transactions"
  on transactions for update
  using (couple_id = get_my_couple_id());

create policy "Users can delete couple transactions"
  on transactions for delete
  using (couple_id = get_my_couple_id());

-- Budgets: filtered by couple_id
create policy "Users can view couple budgets"
  on budgets for select
  using (couple_id = get_my_couple_id());

create policy "Users can insert couple budgets"
  on budgets for insert
  with check (couple_id = get_my_couple_id());

create policy "Users can update couple budgets"
  on budgets for update
  using (couple_id = get_my_couple_id());

create policy "Users can delete couple budgets"
  on budgets for delete
  using (couple_id = get_my_couple_id());

-- Budget categories: through budget's couple_id
create policy "Users can view budget categories"
  on budget_categories for select
  using (budget_id in (select id from budgets where couple_id = get_my_couple_id()));

create policy "Users can insert budget categories"
  on budget_categories for insert
  with check (budget_id in (select id from budgets where couple_id = get_my_couple_id()));

create policy "Users can update budget categories"
  on budget_categories for update
  using (budget_id in (select id from budgets where couple_id = get_my_couple_id()));

create policy "Users can delete budget categories"
  on budget_categories for delete
  using (budget_id in (select id from budgets where couple_id = get_my_couple_id()));

-- Notifications: only for target user
create policy "Users can view own notifications"
  on notifications for select
  using (target_user_id in (select id from profiles where user_id = auth.uid()));

create policy "Users can update own notifications"
  on notifications for update
  using (target_user_id in (select id from profiles where user_id = auth.uid()));

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- REALTIME
-- ============================================

alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table notifications;
