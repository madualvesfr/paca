-- Personal vs Couple scope (Phase 2: RLS rewrite)
-- Replaces couple-only policies on transactions, budgets, and categories with
-- combined policies that admit both scopes. Personal rows are visible only to
-- their owner; couple rows remain visible to both partners. Defaults stay
-- readable by everyone in any mode.
--
-- All existing rows have scope='couple' from migration 00015, so behavior is
-- unchanged for current data: only the new INSERT paths can introduce
-- personal-scope rows.

-- =====================
-- TRANSACTIONS
-- =====================
drop policy if exists "Users can view couple transactions" on transactions;
drop policy if exists "Users can insert couple transactions" on transactions;
drop policy if exists "Users can update couple transactions" on transactions;
drop policy if exists "Users can delete couple transactions" on transactions;

create policy "tx_select" on transactions
  for select using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and paid_by in (
      select id from profiles where user_id = auth.uid()
    ))
  );

create policy "tx_insert" on transactions
  for insert with check (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal'
      and couple_id = get_my_couple_id()
      and paid_by in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "tx_update" on transactions
  for update
  using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and paid_by in (
      select id from profiles where user_id = auth.uid()
    ))
  )
  with check (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal'
      and couple_id = get_my_couple_id()
      and paid_by in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "tx_delete" on transactions
  for delete using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and paid_by in (
      select id from profiles where user_id = auth.uid()
    ))
  );

-- =====================
-- BUDGETS
-- =====================
drop policy if exists "Users can view couple budgets" on budgets;
drop policy if exists "Users can insert couple budgets" on budgets;
drop policy if exists "Users can update couple budgets" on budgets;
drop policy if exists "Users can delete couple budgets" on budgets;

create policy "budget_select" on budgets
  for select using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and owner_id in (
      select id from profiles where user_id = auth.uid()
    ))
  );

create policy "budget_insert" on budgets
  for insert with check (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal'
      and couple_id = get_my_couple_id()
      and owner_id in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "budget_update" on budgets
  for update
  using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and owner_id in (
      select id from profiles where user_id = auth.uid()
    ))
  )
  with check (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal'
      and couple_id = get_my_couple_id()
      and owner_id in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "budget_delete" on budgets
  for delete using (
    (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and owner_id in (
      select id from profiles where user_id = auth.uid()
    ))
  );

-- =====================
-- CATEGORIES
-- =====================
-- Defaults stay readable by anyone authenticated; couple categories visible to
-- both partners; personal categories visible only to owner.
drop policy if exists "Users can view default categories" on categories;
drop policy if exists "Users can view couple categories" on categories;
drop policy if exists "Users can create couple categories" on categories;
drop policy if exists "Users can update couple categories" on categories;
drop policy if exists "Users can delete couple categories" on categories;

create policy "cat_select" on categories
  for select using (
    is_default = true
    or (scope = 'couple' and couple_id = get_my_couple_id())
    or (scope = 'personal' and owner_id in (
      select id from profiles where user_id = auth.uid()
    ))
  );

create policy "cat_insert" on categories
  for insert with check (
    is_default = false
    and (
      (scope = 'couple' and couple_id = get_my_couple_id())
      or (scope = 'personal'
        and couple_id = get_my_couple_id()
        and owner_id in (select id from profiles where user_id = auth.uid())
      )
    )
  );

create policy "cat_update" on categories
  for update
  using (
    is_default = false
    and (
      (scope = 'couple' and couple_id = get_my_couple_id())
      or (scope = 'personal' and owner_id in (
        select id from profiles where user_id = auth.uid()
      ))
    )
  )
  with check (
    is_default = false
    and (
      (scope = 'couple' and couple_id = get_my_couple_id())
      or (scope = 'personal'
        and couple_id = get_my_couple_id()
        and owner_id in (select id from profiles where user_id = auth.uid())
      )
    )
  );

create policy "cat_delete" on categories
  for delete using (
    is_default = false
    and (
      (scope = 'couple' and couple_id = get_my_couple_id())
      or (scope = 'personal' and owner_id in (
        select id from profiles where user_id = auth.uid()
      ))
    )
  );

-- =====================
-- BUDGET_CATEGORIES
-- =====================
-- The existing policies join via couple_id only, which would expose a partner's
-- personal-budget allocations because personal budgets share the couple_id.
-- Replace them with the same OR pattern, scoped through the parent budget.
drop policy if exists "Users can view budget categories" on budget_categories;
drop policy if exists "Users can insert budget categories" on budget_categories;
drop policy if exists "Users can update budget categories" on budget_categories;
drop policy if exists "Users can delete budget categories" on budget_categories;

create policy "budget_cat_select" on budget_categories
  for select using (
    budget_id in (
      select id from budgets where
        (scope = 'couple' and couple_id = get_my_couple_id())
        or (scope = 'personal' and owner_id in (
          select id from profiles where user_id = auth.uid()
        ))
    )
  );

create policy "budget_cat_insert" on budget_categories
  for insert with check (
    budget_id in (
      select id from budgets where
        (scope = 'couple' and couple_id = get_my_couple_id())
        or (scope = 'personal' and owner_id in (
          select id from profiles where user_id = auth.uid()
        ))
    )
  );

create policy "budget_cat_update" on budget_categories
  for update using (
    budget_id in (
      select id from budgets where
        (scope = 'couple' and couple_id = get_my_couple_id())
        or (scope = 'personal' and owner_id in (
          select id from profiles where user_id = auth.uid()
        ))
    )
  );

create policy "budget_cat_delete" on budget_categories
  for delete using (
    budget_id in (
      select id from budgets where
        (scope = 'couple' and couple_id = get_my_couple_id())
        or (scope = 'personal' and owner_id in (
          select id from profiles where user_id = auth.uid()
        ))
    )
  );
