/**
 * Thrown when a free-tier couple hits its monthly AI limit. The edge functions
 * return HTTP 402 { code: "quota_exceeded", ... } before any model call; the
 * scan/advisor hooks translate that into this typed error so screens can open
 * the paywall instead of showing a generic failure.
 */
export class QuotaExceededError extends Error {
  constructor(
    public feature: "scan" | "advisor",
    public used: number,
    public limit: number,
    public resetAt: string,
  ) {
    super("quota_exceeded");
    this.name = "QuotaExceededError";
  }
}

/**
 * Inspect a supabase.functions.invoke() error. If it's the 402 quota response,
 * return a QuotaExceededError; otherwise null (caller rethrows the original).
 */
export async function detectQuotaError(
  error: unknown,
  feature: "scan" | "advisor",
): Promise<QuotaExceededError | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body?.code === "quota_exceeded") {
        return new QuotaExceededError(
          feature,
          Number(body.used) || 0,
          Number(body.limit) || 0,
          String(body.resetAt ?? ""),
        );
      }
    } catch {
      // body wasn't JSON / already consumed — fall through
    }
  }
  return null;
}
