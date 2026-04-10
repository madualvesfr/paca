/**
 * Supported primary currencies for a couple. These match what
 * open.er-api.com publishes and what `Intl.NumberFormat` can format.
 *
 * Adding a currency here makes it appear in the Profile selector and
 * unlocks it as a conversion target in the scan edge functions.
 */
export interface CurrencyOption {
  code: string;        // ISO 4217
  symbol: string;      // Glyph for quick display
  name: string;        // Short English name (used as fallback label)
}

export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [
  { code: "BRL", symbol: "R$",  name: "Brazilian Real" },
  { code: "USD", symbol: "$",   name: "US Dollar" },
  { code: "EUR", symbol: "€",   name: "Euro" },
  { code: "GBP", symbol: "£",   name: "British Pound" },
  { code: "UAH", symbol: "₴",   name: "Ukrainian Hryvnia" },
  { code: "RUB", symbol: "₽",   name: "Russian Ruble" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr",  name: "Swiss Franc" },
] as const;

export const DEFAULT_CURRENCY = "BRL";

export function getCurrencyOption(code: string | null | undefined): CurrencyOption {
  if (!code) return SUPPORTED_CURRENCIES[0];
  const normalized = code.toUpperCase();
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === normalized) ?? {
      code: normalized,
      symbol: normalized,
      name: normalized,
    }
  );
}
