import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { generateInviteCode } from "@paca/shared";
import type { CoupleWithPartner } from "@paca/shared";

export function useCouple() {
  return useQuery({
    queryKey: ["couple"],
    queryFn: async (): Promise<CoupleWithPartner | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.couple_id) return null;

      const { data: couple, error } = await supabase
        .from("couples")
        .select("*")
        .eq("id", profile.couple_id)
        .single();

      if (error) throw error;

      const { data: partner } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("couple_id", profile.couple_id)
        .neq("user_id", user.id)
        .maybeSingle();

      return { ...couple, partner: partner ?? null };
    },
  });
}

export function useCreateCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, couple_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");
      if (profile.couple_id) throw new Error("Você já está em um casal");

      // Generate unique invite code
      let inviteCode: string;
      let attempts = 0;
      do {
        inviteCode = generateInviteCode();
        const { data: existing } = await supabase
          .from("couples")
          .select("id")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      // Generate couple ID client-side to avoid RLS chicken-and-egg
      const coupleId = crypto.randomUUID();

      // Create couple
      const { error: coupleError } = await supabase
        .from("couples")
        .insert({
          id: coupleId,
          invite_code: inviteCode!,
          created_by: profile.id,
        });

      if (coupleError) throw coupleError;

      // Link profile to couple
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ couple_id: coupleId })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      return {
        couple_id: coupleId,
        invite_code: inviteCode!,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useJoinCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data: couple, error: findError } = await supabase
        .from("couples")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (findError) throw new Error("Código de convite inválido");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ couple_id: couple.id })
        .eq("user_id", user.id);

      if (error) throw error;
      return couple;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { primary_currency?: string; auto_convert_currency?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.couple_id) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("couples")
        .update(updates)
        .eq("id", profile.couple_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couple"] });
    },
  });
}
