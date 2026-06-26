import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

/**
 * Live-updates the couple's entitlement. When one partner subscribes, the
 * RevenueCat webhook writes the subscriptions row and this pushes the change to
 * BOTH partners' apps instantly (the table is in the realtime publication), so
 * the paywall dismisses without a manual refresh.
 */
export function useRealtimeSubscription(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`subscription:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}
