import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Service-role client for couple-wide aggregate reads. The free-tier AI quota is
 * PER COUPLE (shared pool), but usage_stats RLS is per-profile (each partner only
 * sees their own rows). Counting with the user's JWT client would miss the
 * partner's usage, so the monthly quota counts via service_role (bypasses RLS).
 * Never returns rows to the client — only an internal count for the gate.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** True if the couple is currently Premium (trialing/active). Fails to false. */
export async function isPremium(admin: SupabaseClient, coupleId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("is_premium")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) {
    console.error("isPremium read failed; treating as free", error);
    return false;
  }
  return data?.is_premium ?? false;
}

export interface MonthlyQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string; // ISO start of next calendar month (UTC)
}

/**
 * Counts the couple's `actions` usage in the current calendar month (UTC) and
 * decides if another call is allowed. Fails OPEN on a counting error — quota is
 * best-effort and must never block a paying-or-free user on a DB hiccup.
 */
export async function checkMonthlyQuota(
  admin: SupabaseClient,
  coupleId: string,
  actions: string[],
  limit: number,
): Promise<MonthlyQuotaResult> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const resetAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();

  const { count, error } = await admin
    .from("usage_stats")
    .select("id", { count: "exact", head: true })
    .eq("couple_id", coupleId)
    .in("action", actions)
    .gte("created_at", startOfMonth);

  if (error) {
    console.error("monthly-quota count failed; failing open", actions, error);
    return { allowed: true, used: 0, limit, resetAt };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit, resetAt };
}

/** HTTP 402 with the quota context, so the client can show the paywall. */
export function quotaExceededResponse(
  result: MonthlyQuotaResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Monthly free limit reached. Upgrade to Premium for unlimited AI.",
      code: "quota_exceeded",
      used: result.used,
      limit: result.limit,
      resetAt: result.resetAt,
    }),
    { status: 402, headers: corsHeaders },
  );
}
