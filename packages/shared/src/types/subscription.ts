export type SubscriptionStatus = "free" | "trialing" | "active" | "expired";
export type SubscriptionPlan = "monthly" | "annual";

/** Per-couple entitlement. Written only by the RevenueCat webhook (service_role). */
export interface Subscription {
  couple_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  /** Derived: true while status is "trialing" or "active". */
  is_premium: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  rc_app_user_id: string | null;
  rc_entitlement: string | null;
  rc_last_event_id: string | null;
  created_at: string;
  updated_at: string;
}
