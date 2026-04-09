import type { Locale } from "../i18n";

export interface Profile {
  id: string;
  user_id: string;
  couple_id: string | null;
  display_name: string;
  avatar_url: string | null;
  language: Locale;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  user_id: string;
  display_name: string;
  couple_id?: string | null;
  avatar_url?: string | null;
  language?: Locale;
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string | null;
  couple_id?: string | null;
  language?: Locale;
}
