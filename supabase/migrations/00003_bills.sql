-- ============================================
-- BILLS (Contas a Pagar)
-- ============================================

-- Bills template (recurring bills)
create table bills (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  name text not null,
  amount bigint not null check (amount > 0),
  due_day int not null check (due_day >= 1 and due_day <= 31),
  is_fixed boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Monthly bill payments (checklist per month)
create table bill_payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references bills(id) on delete cascade,
  month date not null,
  paid boolean default false,
  paid_at timestamptz,
  paid_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bill_id, month)
);

-- Indexes
create index idx_bills_couple_id on bills(couple_id);
create index idx_bill_payments_bill_month on bill_payments(bill_id, month);

-- Updated at triggers
create trigger bills_updated_at before update on bills
  for each row execute function update_updated_at();

create trigger bill_payments_updated_at before update on bill_payments
  for each row execute function update_updated_at();

-- RLS
alter table bills enable row level security;
alter table bill_payments enable row level security;

-- Bills: filtered by couple_id
create policy "Users can view couple bills"
  on bills for select
  using (couple_id = get_my_couple_id());

create policy "Users can insert couple bills"
  on bills for insert
  with check (couple_id = get_my_couple_id());

create policy "Users can update couple bills"
  on bills for update
  using (couple_id = get_my_couple_id());

create policy "Users can delete couple bills"
  on bills for delete
  using (couple_id = get_my_couple_id());

-- Bill payments: through bill's couple_id
create policy "Users can view bill payments"
  on bill_payments for select
  using (bill_id in (select id from bills where couple_id = get_my_couple_id()));

create policy "Users can insert bill payments"
  on bill_payments for insert
  with check (bill_id in (select id from bills where couple_id = get_my_couple_id()));

create policy "Users can update bill payments"
  on bill_payments for update
  using (bill_id in (select id from bills where couple_id = get_my_couple_id()));

create policy "Users can delete bill payments"
  on bill_payments for delete
  using (bill_id in (select id from bills where couple_id = get_my_couple_id()));
