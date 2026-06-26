-- Speeds up the per-couple monthly AI quota count (M1.2): the edge functions
-- count usage_stats by couple_id + action in the current calendar month.
-- Additive and reversible (drop index). Quota works without it, just slower.

create index if not exists usage_stats_couple_action_created_idx
  on usage_stats (couple_id, action, created_at desc);
