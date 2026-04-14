import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { BudgetWithCategories, BudgetInsert, BudgetCategoryInsert } from "@paca/shared";

interface UseBudgetOptions {
  coupleId: string;
  month: string;
}

export function useBudget(options: UseBudgetOptions) {
  const { coupleId, month } = options;

  return useQuery({
    queryKey: ["budget", coupleId, month],
    queryFn: async (): Promise<BudgetWithCategories | null> => {
      const { data: budget, error } = await supabase
        .from("budgets")
        .select(`
          *,
          categories:budget_categories(
            *,
            category:categories(name, icon, color)
          )
        `)
        .eq("couple_id", coupleId)
        .eq("month", month)
        .maybeSingle();

      if (error) throw error;
      if (!budget) return null;

      // Calculate spent per category
      const { data: transactions } = await supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("couple_id", coupleId)
        .eq("type", "expense")
        .gte("date", month)
        .lt("date", nextMonth(month));

      const spentByCategory = (transactions ?? []).reduce(
        (acc, t) => {
          acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        ...budget,
        categories: budget.categories.map((bc: any) => ({
          ...bc,
          spent: spentByCategory[bc.category_id] ?? 0,
        })),
      } as BudgetWithCategories;
    },
    enabled: !!coupleId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      budget,
      categories,
    }: {
      budget: BudgetInsert;
      categories: Omit<BudgetCategoryInsert, "budget_id">[];
    }) => {
      // Upsert budget on (couple_id, month) so saving again edits instead of 409-ing.
      const { data: newBudget, error } = await supabase
        .from("budgets")
        .upsert(budget, { onConflict: "couple_id,month" })
        .select()
        .single();

      if (error) throw error;

      // Reset category allocations: delete existing then reinsert the submitted ones.
      const { error: delError } = await supabase
        .from("budget_categories")
        .delete()
        .eq("budget_id", newBudget.id);

      if (delError) throw delError;

      if (categories.length > 0) {
        const { error: catError } = await supabase
          .from("budget_categories")
          .insert(
            categories.map((c) => ({ ...c, budget_id: newBudget.id }))
          );

        if (catError) throw catError;
      }

      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}

function nextMonth(monthStr: string): string {
  const date = new Date(monthStr + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
