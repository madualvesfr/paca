-- Make user deletion safe (App Store Review Guideline 5.1.1.v).
--
-- Today, deleting a profile would fail because several foreign keys reference
-- profiles(id) with the default NO ACTION. The delete-account edge function
-- explicitly drops the user's personal data first; the FKs below cover the
-- couple-shared rows that should outlive a single member.

-- 1) transactions.paid_by — couple txns paid by the user become orphaned
--    rather than deleted, so the partner keeps the history.
alter table transactions
  alter column paid_by drop not null,
  drop constraint transactions_paid_by_fkey,
  add constraint transactions_paid_by_fkey
    foreign key (paid_by) references profiles(id) on delete set null;

-- 2) couples.created_by — never had a real FK; add one and allow null so the
--    couple survives the creator leaving.
alter table couples
  alter column created_by drop not null;

-- Add FK only if missing (defensive in case it was added out of band)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'couples_created_by_fkey' and conrelid = 'couples'::regclass
  ) then
    alter table couples
      add constraint couples_created_by_fkey
        foreign key (created_by) references profiles(id) on delete set null;
  end if;
end $$;

-- 3) bill_payments.paid_by — a payment record stays even if the payer leaves.
alter table bill_payments
  drop constraint bill_payments_paid_by_fkey,
  add constraint bill_payments_paid_by_fkey
    foreign key (paid_by) references profiles(id) on delete set null;

-- 4) notifications.target_user_id — notifications are personal; cascade-delete.
alter table notifications
  drop constraint notifications_target_user_id_fkey,
  add constraint notifications_target_user_id_fkey
    foreign key (target_user_id) references profiles(id) on delete cascade;
