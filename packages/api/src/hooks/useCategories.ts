import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { Category } from "@paca/shared";

async function getCoupleId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("user_id", user.id)
    .single();
  return profile?.couple_id ?? null;
}

async function getCoupleContext(): Promise<{
  coupleId: string | null;
  hidden: string[];
}> {
  const coupleId = await getCoupleId();
  if (!coupleId) return { coupleId: null, hidden: [] };
  const { data: couple } = await supabase
    .from("couples")
    .select("hidden_category_ids")
    .eq("id", coupleId)
    .single();
  return {
    coupleId,
    hidden: (couple?.hidden_category_ids as string[]) ?? [],
  };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { coupleId, hidden } = await getCoupleContext();
      let query = supabase.from("categories").select("*").order("name");
      if (coupleId) {
        query = query.or(`is_default.eq.true,couple_id.eq.${coupleId}`);
      } else {
        query = query.eq("is_default", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      const all = (data ?? []) as Category[];
      return all.filter((c) => !hidden.includes(c.id));
    },
  });
}

async function translateCategoryName(
  name: string,
  sourceLocale: string
): Promise<Record<string, string> | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-category", {
      body: { name, sourceLocale },
    });
    if (error) throw error;
    return (data?.translations as Record<string, string>) ?? null;
  } catch (err) {
    console.error("translate-category failed", err);
    return null;
  }
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      icon: string;
      color: string;
      locale: string;
    }) => {
      const coupleId = await getCoupleId();
      if (!coupleId) throw new Error("No couple");

      const translations = await translateCategoryName(input.name, input.locale);

      const { data, error } = await supabase
        .from("categories")
        .insert({
          couple_id: coupleId,
          name: input.name,
          icon: input.icon,
          color: input.color,
          is_default: false,
          name_translations: translations,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      icon?: string;
      color?: string;
      locale?: string;
    }) => {
      const updates: Partial<Category> = {};
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.color !== undefined) updates.color = input.color;
      if (input.name !== undefined) {
        updates.name = input.name;
        const translations = await translateCategoryName(
          input.name,
          input.locale ?? "en"
        );
        if (translations) updates.name_translations = translations;
      }
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: { id: string; is_default: boolean }) => {
      if (category.is_default) {
        // Soft-hide: add the category id to the couple's hidden list so the
        // shared default stays intact for every other couple.
        const { coupleId, hidden } = await getCoupleContext();
        if (!coupleId) throw new Error("No couple");
        if (!hidden.includes(category.id)) {
          const next = [...hidden, category.id];
          const { error } = await supabase
            .from("couples")
            .update({ hidden_category_ids: next })
            .eq("id", coupleId);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", category.id)
          .eq("is_default", false);
        if (error) throw error;
      }
      return category.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["couple"] });
    },
  });
}
