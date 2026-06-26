import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { Subscription } from "@paca/shared";

/** A safe default for a couple that has no subscription row yet (or no couple). */
function freeSubscription(coupleId: string): Subscription {
  return {
    couple_id: coupleId,
    status: "free",
    plan: null,
    is_premium: false,
    current_period_end: null,
    trial_end: null,
    rc_app_user_id: null,
    rc_entitlement: null,
    rc_last_event_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Per-couple entitlement. Returns null when the user has no couple, otherwise the
 * couple's subscription (defaulting to Free if the row is missing). Read-only —
 * the row is written only by the RevenueCat webhook (service_role).
 */
export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<Subscription | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.couple_id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .maybeSingle();

      if (error) throw error;
      return (data as Subscription | null) ?? freeSubscription(profile.couple_id);
    },
  });
}

/** Convenience: is the current couple Premium right now? Defaults to false. */
export function useIsPremium(): boolean {
  const { data } = useSubscription();
  return data?.is_premium ?? false;
}
