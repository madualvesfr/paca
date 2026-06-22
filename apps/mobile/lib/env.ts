// Single source of truth for which environment this build targets.
// The value comes from EXPO_PUBLIC_APP_ENV, injected per EAS build profile
// (development/preview -> "staging", production -> "production") and from
// apps/mobile/.env for local `expo start`. Anything other than "staging" is
// treated as production so a missing var fails safe to prod behavior.
export type AppEnv = "staging" | "production";

export const APP_ENV: AppEnv =
  process.env.EXPO_PUBLIC_APP_ENV === "staging" ? "staging" : "production";

export const IS_PRODUCTION = APP_ENV === "production";
export const IS_STAGING = APP_ENV === "staging";

/** True when the Supabase env vars are missing or still placeholders. */
export const HAS_SUPABASE_CONFIG = (() => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  return url.startsWith("https://") && !url.includes("REPLACE_WITH");
})();
