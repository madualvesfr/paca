import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { PartnerOffer } from "@paca/shared";

/** Active affiliate offers, ordered for display. Config-driven (from the DB). */
export function usePartnerOffers() {
  return useQuery({
    queryKey: ["partner-offers"],
    queryFn: async (): Promise<PartnerOffer[]> => {
      const { data, error } = await supabase
        .from("partner_offers")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PartnerOffer[];
    },
  });
}

/** Logs an offer click (analytics + compliance trail). Fire-and-forget. */
export function useLogOfferClick() {
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, couple_id")
        .eq("user_id", user.id)
        .single();
      if (!profile) return;
      await supabase.from("partner_offer_clicks").insert({
        partner_offer_id: offerId,
        profile_id: profile.id,
        couple_id: profile.couple_id,
      });
    },
  });
}
