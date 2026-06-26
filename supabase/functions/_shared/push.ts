import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Send an Expo push to one or more device tokens. Best-effort, never throws. */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const messages = tokens
    .filter((tk) => typeof tk === "string" && tk.startsWith("ExponentPushToken"))
    .map((to) => ({ to, title, body, data, sound: "default" }));
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error("expo push send failed", e);
  }
}

/**
 * Insert an in-app notification AND push it to the recipient's device (if they
 * have a token and push enabled). Uses a service_role client (reads push_tokens
 * across users). Call from server-side functions only.
 */
export async function notifyAndPush(
  admin: SupabaseClient,
  n: { couple_id: string; target_user_id: string; type: string; title: string; body: string },
): Promise<void> {
  await admin.from("notifications").insert(n);
  const { data: tok } = await admin
    .from("push_tokens")
    .select("expo_push_token, push_enabled")
    .eq("profile_id", n.target_user_id)
    .maybeSingle();
  if (tok?.push_enabled && tok.expo_push_token) {
    await sendExpoPush([tok.expo_push_token], n.title, n.body, { type: n.type });
  }
}
