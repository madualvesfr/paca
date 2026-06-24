import { Platform } from "react-native";

export type PlanId = "monthly" | "annual";

/**
 * Billing facade. RevenueCat is NOT wired yet (react-native-purchases is not
 * installed — it needs a dev build). Until then these throw `BILLING_NOT_WIRED`
 * and the paywall shows a "coming soon" message.
 *
 * ── To wire RevenueCat (M1.4b, after installing the dep + RC dashboard setup):
 *   1. `npx expo install react-native-purchases`
 *   2. Add the API keys (EAS env: RC_IOS_KEY / RC_ANDROID_KEY).
 *   3. In app/_layout.tsx, configure on launch, keyed by the couple_id so the
 *      subscription is shared by both partners:
 *        import Purchases from "react-native-purchases";
 *        Purchases.configure({ apiKey, appUserID: coupleId });
 *   4. Replace the bodies below:
 *        const offerings = await Purchases.getOfferings();
 *        const pkg = offerings.current?.[plan === "annual" ? "annual" : "monthly"];
 *        await Purchases.purchasePackage(pkg);   // entitlement flows via the webhook
 *        // restore: await Purchases.restorePurchases();
 *   The RevenueCat webhook (supabase/functions/revenuecat-webhook) then writes
 *   subscriptions.* and useRealtimeSubscription updates both apps instantly.
 */
export const BILLING_WIRED = false;

export async function purchaseSubscription(_plan: PlanId): Promise<void> {
  void Platform.OS;
  throw new Error("BILLING_NOT_WIRED");
}

export async function restorePurchases(): Promise<void> {
  throw new Error("BILLING_NOT_WIRED");
}
