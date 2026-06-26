// Display fallbacks for the paywall. Once RevenueCat is wired, the real
// localized store prices come from RC Offerings — these are the BR defaults shown
// before/if RC offerings aren't loaded. Keep in sync with the store products.
export const SUBSCRIPTION_PRICING = {
  monthly: { price: "R$ 24,90" },
  annual: { price: "R$ 179,90" },
  /** Roughly how much the annual plan saves vs 12x monthly, for the badge. */
  annualSavingsLabel: "−40%",
  trialDays: 7,
} as const;

export type SubscriptionPlanId = "monthly" | "annual";
