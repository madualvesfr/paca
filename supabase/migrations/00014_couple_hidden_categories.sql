-- Per-couple soft-hide for default categories. The defaults stay shared across
-- the app; each couple can choose which ones to hide from their own views.

alter table couples
  add column if not exists hidden_category_ids uuid[] not null default '{}';
