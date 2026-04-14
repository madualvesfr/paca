import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  type Locale,
  type TranslationKeys,
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  getTranslations,
  getGreetingLocalized,
  formatDateLocalized,
  formatMonthYearLocalized,
  LOCALE_DATE_MAP,
} from "@paca/shared";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  t: TranslationKeys;
  greeting: () => string;
  formatDate: (dateStr: string) => string;
  formatMonthYear: (dateStr: string) => string;
  /** Format a cent amount. Pass `overrideCurrency` to render a different currency (e.g. a transaction's original_currency). */
  formatCurrency: (value: number, overrideCurrency?: string | null) => string;
  /** Compact currency for tight spaces: 1.2K, 3.4M, 1.2B. Falls back to full format for small values. */
  formatCurrencyCompact: (value: number, overrideCurrency?: string | null) => string;
  /** Translates a category. Pass a Category object (with name_translations) for custom-category support, or a raw name for the legacy defaults path. */
  translateCategory: (
    nameOrCategory:
      | string
      | { name?: string | null; name_translations?: Record<string, string> | null }
      | null
      | undefined
  ) => string;
  dateLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = "paca_locale";
const CURRENCY_STORAGE_KEY = "paca_currency";

function getStoredLocale(): Locale {
  try {
    const stored = (typeof window !== "undefined" && localStorage.getItem(LOCALE_STORAGE_KEY)) ||
      (typeof globalThis !== "undefined" && (globalThis as any).__paca_locale);
    if (stored === "en" || stored === "pt" || stored === "ru" || stored === "uk") return stored;
  } catch {}
  return DEFAULT_LOCALE;
}

function storeLocale(locale: Locale) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
    (globalThis as any).__paca_locale = locale;
  } catch {}
}

function getStoredCurrency(): string {
  try {
    const stored = (typeof window !== "undefined" && localStorage.getItem(CURRENCY_STORAGE_KEY)) ||
      (typeof globalThis !== "undefined" && (globalThis as any).__paca_currency);
    if (typeof stored === "string" && /^[A-Z]{3}$/.test(stored)) return stored;
  } catch {}
  return DEFAULT_CURRENCY;
}

function storeCurrency(currency: string) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    }
    (globalThis as any).__paca_currency = currency;
  } catch {}
}

function makeFormatter(locale: Locale, currency: string, compact: boolean) {
  const dateLocale = LOCALE_DATE_MAP[locale];
  try {
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency,
      ...(compact ? { notation: "compact" as const, maximumFractionDigits: 1 } : {}),
    });
  } catch {
    // Unknown currency code — fall back to the default
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      ...(compact ? { notation: "compact" as const, maximumFractionDigits: 1 } : {}),
    });
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [currency, setCurrencyState] = useState<string>(getStoredCurrency);

  // Cache full + compact formatters per (locale, currency) pair so that
  // rendering a line in the couple's primary currency and another line in
  // its original currency both reuse memoised Intl instances.
  const formatters = useMemo(() => {
    const cache = new Map<string, { full: Intl.NumberFormat; compact: Intl.NumberFormat }>();
    const get = (cur: string) => {
      const key = `${locale}:${cur}`;
      let entry = cache.get(key);
      if (!entry) {
        entry = {
          full: makeFormatter(locale, cur, false),
          compact: makeFormatter(locale, cur, true),
        };
        cache.set(key, entry);
      }
      return entry;
    };
    // Warm the default currency formatter
    get(currency);
    return get;
  }, [locale, currency]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    const normalized = (newCurrency || DEFAULT_CURRENCY).toUpperCase();
    setCurrencyState(normalized);
    storeCurrency(normalized);
  }, []);

  const t = getTranslations(locale);

  const greeting = useCallback(() => getGreetingLocalized(locale), [locale]);
  const formatDate = useCallback((dateStr: string) => formatDateLocalized(dateStr, locale), [locale]);
  const formatMonthYear = useCallback((dateStr: string) => formatMonthYearLocalized(dateStr, locale), [locale]);

  const formatCurrency = useCallback(
    (value: number, overrideCurrency?: string | null) => {
      const cur = (overrideCurrency ?? currency).toUpperCase();
      return formatters(cur).full.format(value / 100);
    },
    [formatters, currency]
  );

  const formatCurrencyCompact = useCallback(
    (value: number, overrideCurrency?: string | null) => {
      const cur = (overrideCurrency ?? currency).toUpperCase();
      const entry = formatters(cur);
      const whole = value / 100;
      if (Math.abs(whole) < 10000) return entry.full.format(whole);
      return entry.compact.format(whole);
    },
    [formatters, currency]
  );

  const translateCategory = useCallback(
    (
      nameOrCategory:
        | string
        | {
            name?: string | null;
            name_translations?: Record<string, string> | null;
          }
        | null
        | undefined
    ) => {
      if (!nameOrCategory) return "";
      const isObject = typeof nameOrCategory === "object";
      const rawName = isObject ? nameOrCategory.name ?? "" : nameOrCategory;
      const translations = isObject ? nameOrCategory.name_translations : null;
      if (translations && translations[locale]) return translations[locale];
      if (!rawName) return "";
      const map = t.categories as Record<string, string>;
      return map[rawName] ?? rawName;
    },
    [t, locale]
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    currency,
    setCurrency,
    t,
    greeting,
    formatDate,
    formatMonthYear,
    formatCurrency,
    formatCurrencyCompact,
    translateCategory,
    dateLocale: LOCALE_DATE_MAP[locale],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

/**
 * Call once in a top-level authenticated component to sync the
 * profile's stored language preference into the i18n context.
 */
export function useSyncLocaleFromProfile(profileLanguage: Locale | undefined) {
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    if (profileLanguage && profileLanguage !== locale) {
      setLocale(profileLanguage);
    }
    // Only run when profileLanguage first becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLanguage]);
}

/**
 * Sync the couple's primary currency into the i18n context so that
 * `formatCurrency` renders everything in the couple's chosen currency
 * without each caller having to pass it around.
 */
export function useSyncCurrencyFromCouple(primaryCurrency: string | undefined | null) {
  const { currency, setCurrency } = useI18n();

  useEffect(() => {
    if (primaryCurrency && primaryCurrency !== currency) {
      setCurrency(primaryCurrency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCurrency]);
}
