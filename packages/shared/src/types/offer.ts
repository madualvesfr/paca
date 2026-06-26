/** A config-driven affiliate offer shown on the Recomendações tab. */
export interface PartnerOffer {
  id: string;
  title_translations: Record<string, string>;
  description_translations: Record<string, string>;
  affiliate_url: string;
  category: string | null;
  icon: string | null;
  icon_color: string | null;
  requires_opt_in: boolean;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Categories whose offers must be hidden from a couple with a negative balance. */
export const CREDIT_OFFER_CATEGORIES = ["credit", "loan"] as const;
