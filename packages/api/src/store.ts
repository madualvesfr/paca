import { create } from "zustand";
import type { Profile, CoupleWithPartner } from "@paca/shared";

interface AppState {
  profile: Profile | null;
  couple: CoupleWithPartner | null;
  setProfile: (profile: Profile | null) => void;
  setCouple: (couple: CoupleWithPartner | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  couple: null,
  setProfile: (profile) => set({ profile }),
  setCouple: (couple) => set({ couple }),
  reset: () => set({ profile: null, couple: null }),
}));
