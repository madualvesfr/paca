-- Track whether a user has finished (or skipped) the welcome tutorial
-- so we only show it once automatically. The Profile page has a
-- "Watch tutorial again" action that resets this flag back to false.
alter table profiles
  add column if not exists tutorial_completed boolean not null default false;
