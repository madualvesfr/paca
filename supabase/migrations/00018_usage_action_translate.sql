-- Add the 'translate' action to the usage_action enum so the
-- translate-category Edge Function can be rate-limited and metered the same
-- way as the other Gemini-backed functions (scan_receipt, scan_statement,
-- advise). Idempotent so re-running the migration is safe.

alter type usage_action add value if not exists 'translate';
