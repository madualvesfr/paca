import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// React Native has no localStorage. Without an explicit storage adapter GoTrue
// falls back to in-memory storage, so getSession() returns null after every
// cold start and users are bounced back to login on each launch. AsyncStorage
// persists the session across restarts. Metro resolves this file over
// supabase.ts on iOS/Android via the `.native` platform extension.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export { createClient } from "@supabase/supabase-js";
