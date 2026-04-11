/**
 * Hardcoded list of app owner emails that can see the admin analytics
 * dashboard. Keep in sync with the Supabase RLS policies:
 *   - usage_stats_select_admin
 *   - profiles_select_admin
 */
export const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  "madualvesfr@icloud.com",
  "madualvesfr@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
