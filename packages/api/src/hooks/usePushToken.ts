import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";

/**
 * Upserts the current user's Expo push token. Call after the mobile app obtains
 * a token (Notifications.getExpoPushTokenAsync) once expo-notifications is
 * installed. The token is stored own-access-only (push_tokens table).
 */
export function useUpdatePushToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) return;
      await supabase
        .from("push_tokens")
        .upsert(
          { profile_id: profile.id, expo_push_token: token, push_enabled: true },
          { onConflict: "profile_id" },
        );
    },
  });
}
