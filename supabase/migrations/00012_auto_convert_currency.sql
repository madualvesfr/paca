-- Per-couple toggle: when false, scanned transactions keep their original
-- currency instead of being converted to the couple's primary currency.
-- Defaults to true to preserve current behavior.

alter table couples
  add column if not exists auto_convert_currency boolean not null default true;
