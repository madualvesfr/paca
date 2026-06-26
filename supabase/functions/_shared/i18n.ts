// Shared i18n for Supabase Edge Functions.
//
// Edge functions run on Deno and cannot import the app's `@paca/shared` i18n
// (a workspace package resolved by the bundler), so this module is the
// Supabase-side home for any user-facing copy a function emits. Add new
// message groups and locales here rather than hardcoding strings inside a
// function. Portuguese is the safe fallback (see `resolveLang`).

export type Lang = "pt" | "en" | "ru" | "uk";

/**
 * Maps a raw `profiles.language` value to a supported {@link Lang}. Anything
 * that isn't an explicitly supported locale — empty, null, undefined, or
 * garbage — falls back to Portuguese.
 */
export function resolveLang(language?: string | null): Lang {
  const code = (language ?? "").slice(0, 2).toLowerCase();
  if (code === "en" || code === "ru" || code === "uk") return code;
  return "pt";
}

export type BudgetAlertKey =
  | "nearPersonal"
  | "exceededPersonal"
  | "nearCouple"
  | "exceededCouple";

interface BudgetAlertCopy {
  title: string;
  body: (pct: number) => string;
}

const BUDGET_ALERTS: Record<Lang, Record<BudgetAlertKey, BudgetAlertCopy>> = {
  pt: {
    nearPersonal: {
      title: "Seu orçamento pessoal quase no limite!",
      body: (pct) => `Você já gastou ${pct}% do seu orçamento pessoal este mês.`,
    },
    exceededPersonal: {
      title: "Orçamento pessoal estourado!",
      body: (pct) => `Seu orçamento pessoal foi ultrapassado (${pct}%).`,
    },
    nearCouple: {
      title: "Orçamento quase no limite!",
      body: (pct) => `Vocês já gastaram ${pct}% do orçamento do mês.`,
    },
    exceededCouple: {
      title: "Orçamento estourado!",
      body: (pct) => `O orçamento do mês foi ultrapassado (${pct}%).`,
    },
  },
  en: {
    nearPersonal: {
      title: "Your personal budget is almost maxed out!",
      body: (pct) => `You've already spent ${pct}% of your personal budget this month.`,
    },
    exceededPersonal: {
      title: "Personal budget exceeded!",
      body: (pct) => `Your personal budget has been exceeded (${pct}%).`,
    },
    nearCouple: {
      title: "Budget almost maxed out!",
      body: (pct) => `You've already spent ${pct}% of this month's budget.`,
    },
    exceededCouple: {
      title: "Budget exceeded!",
      body: (pct) => `This month's budget has been exceeded (${pct}%).`,
    },
  },
  ru: {
    nearPersonal: {
      title: "Ваш личный бюджет почти исчерпан!",
      body: (pct) => `Вы уже потратили ${pct}% личного бюджета в этом месяце.`,
    },
    exceededPersonal: {
      title: "Личный бюджет превышен!",
      body: (pct) => `Ваш личный бюджет превышен (${pct}%).`,
    },
    nearCouple: {
      title: "Бюджет почти исчерпан!",
      body: (pct) => `Вы уже потратили ${pct}% бюджета этого месяца.`,
    },
    exceededCouple: {
      title: "Бюджет превышен!",
      body: (pct) => `Бюджет этого месяца превышен (${pct}%).`,
    },
  },
  uk: {
    nearPersonal: {
      title: "Ваш особистий бюджет майже вичерпано!",
      body: (pct) => `Ви вже витратили ${pct}% особистого бюджету цього місяця.`,
    },
    exceededPersonal: {
      title: "Особистий бюджет перевищено!",
      body: (pct) => `Ваш особистий бюджет перевищено (${pct}%).`,
    },
    nearCouple: {
      title: "Бюджет майже вичерпано!",
      body: (pct) => `Ви вже витратили ${pct}% бюджету цього місяця.`,
    },
    exceededCouple: {
      title: "Бюджет перевищено!",
      body: (pct) => `Бюджет цього місяця перевищено (${pct}%).`,
    },
  },
};

/**
 * Renders a localized budget-alert notification (title + body) for the given
 * language and alert variant. `pct` is the budget-usage percentage.
 */
export function budgetAlert(
  lang: Lang,
  key: BudgetAlertKey,
  pct: number
): { title: string; body: string } {
  const copy = BUDGET_ALERTS[lang][key];
  return { title: copy.title, body: copy.body(pct) };
}
