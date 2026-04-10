import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { AdviceRequest, PurchaseAdvice } from "@paca/shared";

/**
 * History of past advice queries visible to the current user
 * (their own + any the partner chose to share).
 */
export function usePurchaseAdviceHistory(coupleId: string | undefined | null) {
  return useQuery({
    queryKey: ["purchase-advice", coupleId],
    queryFn: async (): Promise<PurchaseAdvice[]> => {
      if (!coupleId) return [];
      const { data, error } = await supabase
        .from("purchase_advice")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as PurchaseAdvice[];
    },
    enabled: !!coupleId,
  });
}

/**
 * Ask Paca whether the user should make a purchase. Invokes the
 * advise-purchase edge function which computes the verdict server-side
 * and stores the result in the `purchase_advice` table.
 */
export function useAskAdvisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdviceRequest): Promise<PurchaseAdvice> => {
      const { data, error } = await supabase.functions.invoke("advise-purchase", {
        body: payload,
      });
      if (error) throw error;
      return data as PurchaseAdvice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-advice"] });
    },
  });
}

/**
 * Flip the `is_shared` flag of a single advice entry so the partner
 * starts seeing it. Only the original asker can toggle this.
 */
export function useShareAdvice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) => {
      const { data, error } = await supabase
        .from("purchase_advice")
        .update({ is_shared: shared })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PurchaseAdvice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-advice"] });
    },
  });
}
