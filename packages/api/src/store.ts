import { create } from "zustand";
import type { Profile, CoupleWithPartner } from "@paca/shared";

export type FinanceMode = "couple" | "personal";

interface AppState {
  profile: Profile | null;
  couple: CoupleWithPartner | null;
  mode: FinanceMode;
  setProfile: (profile: Profile | null) => void;
  setCouple: (couple: CoupleWithPartner | null) => void;
  setMode: (mode: FinanceMode) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  couple: null,
  mode: "couple",
  setProfile: (profile) => set({ profile }),
  setCouple: (couple) => set({ couple }),
  setMode: (mode) => set({ mode }),
  reset: () => set({ profile: null, couple: null, mode: "couple" }),
}));
