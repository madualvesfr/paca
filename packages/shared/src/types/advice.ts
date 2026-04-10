export type AdviceVerdict = "go" | "wait" | "avoid";
export type AdviceUrgency = "now" | "this_month" | "just_thinking";

export interface AdviceImpact {
  balance_now: number;
  balance_after: number;
  remaining_bills: number;
  income_share_percent: number | null;
  budget_usage_after_percent: number | null;
  category_spent_30d: number | null;
  avg_monthly_income: number;
  primary_currency: string;
}

export interface PurchaseAdvice {
  id: string;
  couple_id: string;
  asked_by: string;
  item: string;
  amount: number;
  currency: string;
  original_amount: number | null;
  original_currency: string | null;
  exchange_rate: number | null;
  category_id: string | null;
  urgency: AdviceUrgency;
  notes: string | null;
  is_shared: boolean;
  verdict: AdviceVerdict;
  reasoning: string;
  impact: AdviceImpact | null;
  alternatives: string | null;
  created_at: string;
}

export interface AdviceRequest {
  item: string;
  amount: number;           // cents in the picked currency
  currency: string;         // ISO 4217
  category_id?: string | null;
  urgency: AdviceUrgency;
  notes?: string | null;
  language?: string;
}
