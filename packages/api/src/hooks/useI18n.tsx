import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  type Locale,
  type TranslationKeys,
  DEFAULT_LOCALE,
  getTranslations,
  getGreetingLocalized,
  formatDateLocalized,
  formatMonthYearLocalized,
  LOCALE_DATE_MAP,
} from "@paca/shared";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
  greeting: () => string;
  formatDate: (dateStr: string) => string;
  formatMonthYear: (dateStr: string) => string;
  formatCurrency: (value: number) => string;
  /** Compact currency for tight spaces: 1.2K, 3.4M, 1.2B. Falls back to full format for values < 10000 cents (R$100). */
  formatCurrencyCompact: (value: number) => string;
  dateLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "paca_locale";

function getStoredLocale(): Locale {
  try {
    const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) ||
      (typeof globalThis !== "undefined" && (globalThis as any).__paca_locale);
    if (stored === "en" || stored === "pt" || stored === "ru" || stored === "uk") return stored;
  } catch {}
  return DEFAULT_LOCALE;
}

function storeLocale(locale: Locale) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    (globalThis as any).__paca_locale = locale;
  } catch {}
}

function createCurrencyFormatter(locale: Locale) {
  const dateLocale = LOCALE_DATE_MAP[locale];
  return new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency: "BRL",
  });
}

function createCompactCurrencyFormatter(locale: Locale) {
  const dateLocale = LOCALE_DATE_MAP[locale];
  return new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [currencyFormatter, setCurrencyFormatter] = useState(() => createCurrencyFormatter(getStoredLocale()));
  const [compactCurrencyFormatter, setCompactCurrencyFormatter] = useState(() => createCompactCurrencyFormatter(getStoredLocale()));

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
    setCurrencyFormatter(createCurrencyFormatter(newLocale));
    setCompactCurrencyFormatter(createCompactCurrencyFormatter(newLocale));
  }, []);

  const t = getTranslations(locale);

  const greeting = useCallback(() => getGreetingLocalized(locale), [locale]);
  const formatDate = useCallback((dateStr: string) => formatDateLocalized(dateStr, locale), [locale]);
  const formatMonthYear = useCallback((dateStr: string) => formatMonthYearLocalized(dateStr, locale), [locale]);
  const formatCurrency = useCallback((value: number) => currencyFormatter.format(value / 100), [currencyFormatter]);
  const formatCurrencyCompact = useCallback(
    (value: number) => {
      const reais = value / 100;
      // Use full format for small values where compact adds no benefit
      if (Math.abs(reais) < 10000) return currencyFormatter.format(reais);
      return compactCurrencyFormatter.format(reais);
    },
    [currencyFormatter, compactCurrencyFormatter]
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    greeting,
    formatDate,
    formatMonthYear,
    formatCurrency,
    formatCurrencyCompact,
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
