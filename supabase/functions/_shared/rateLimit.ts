import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface RateLimitConfig {
  /** usage_stats `action` enum value to count (e.g. "scan_receipt"). */
  action: string;
  /** Look-back window in seconds. */
  windowSeconds: number;
  /** Max allowed calls within the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Per-user rate limit for the paid Gemini endpoints. Counts the caller's prior
 * `action` rows in usage_stats within the window using the USER-SCOPED client
 * (RLS policy `usage_stats_select_own` lets a user read only their own rows),
 * so no service_role is needed.
 *
 * Fails OPEN on a counting error: abuse protection is best-effort and must never
 * block a legitimate user because the meter query hiccuped.
 *
 * Note: usage_stats rows are inserted on SUCCESS, so this caps sustained
 * successful usage (the real token-cost driver). A small concurrent burst can
 * slip through before the first insert lands — acceptable for cost protection.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  profileId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const sinceIso = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from("usage_stats")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("action", config.action)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("rate-limit count failed; failing open", config.action, error);
    return { allowed: true, used: 0, limit: config.max, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;
  const allowed = used < config.max;
  return {
    allowed,
    used,
    limit: config.max,
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
  };
}

/** Standard 429 response with CORS headers + Retry-After. */
export function rateLimitedResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please wait a bit before trying again.",
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
