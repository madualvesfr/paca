-- Multi-currency support
-- Each couple has a primary currency (defaults to BRL).
-- Each transaction stores both the converted amount (in the couple's
-- primary currency) and the original amount + currency the AI detected,
-- along with the exchange rate used at conversion time.

-- 1) Couples: primary currency
alter table couples
  add column if not exists primary_currency char(3) not null default 'BRL';

-- 2) Transactions: detected-from-AI currency, converted stays in `amount`
alter table transactions
  add column if not exists currency char(3) not null default 'BRL',
  add column if not exists original_amount bigint,
  add column if not exists original_currency char(3),
  add column if not exists exchange_rate numeric(18, 8);

-- Backfill existing rows: treat everything already saved as already in BRL,
-- with original == converted and rate = 1.
update transactions
  set currency = coalesce(currency, 'BRL'),
      original_amount = coalesce(original_amount, amount),
      original_currency = coalesce(original_currency, 'BRL'),
      exchange_rate = coalesce(exchange_rate, 1)
  where original_amount is null;

-- Sanity checks on the new columns
alter table transactions
  add constraint transactions_currency_format check (currency ~ '^[A-Z]{3}$'),
  add constraint transactions_original_currency_format
    check (original_currency is null or original_currency ~ '^[A-Z]{3}$');
