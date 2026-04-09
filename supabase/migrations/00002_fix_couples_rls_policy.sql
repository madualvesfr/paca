-- Fix: Restrict couple creation to ensure created_by matches the current user's profile
-- Previously, the INSERT policy was `with check (true)` which allowed any authenticated
-- user to create a couple with any created_by value.

drop policy if exists "Users can create couple" on couples;

create policy "Users can create couple"
  on couples for insert
  with check (
    created_by in (select id from profiles where user_id = auth.uid())
  );

-- Add DELETE policy for notifications (was missing)
create policy "Users can delete own notifications"
  on notifications for delete
  using (target_user_id in (select id from profiles where user_id = auth.uid()));

-- Add composite indexes for common query patterns
create index if not exists idx_transactions_couple_date on transactions(couple_id, date);
create index if not exists idx_transactions_couple_type on transactions(couple_id, type);
create index if not exists idx_budget_categories_budget_id on budget_categories(budget_id);
