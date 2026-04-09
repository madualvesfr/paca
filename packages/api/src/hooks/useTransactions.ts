import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type {
  TransactionWithCategory,
  TransactionInsert,
  TransactionUpdate,
} from "@paca/shared";
import { getMonthRange } from "@paca/shared";

interface UseTransactionsOptions {
  coupleId: string;
  month?: string;
  type?: "income" | "expense";
  categoryId?: string;
  paidBy?: string;
}

export function useTransactions(options: UseTransactionsOptions) {
  const { coupleId, month, type, categoryId, paidBy } = options;

  return useQuery({
    queryKey: ["transactions", coupleId, month, type, categoryId, paidBy],
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          category:categories(name, icon, color),
          paid_by_profile:profiles!paid_by(display_name, avatar_url)
        `)
        .eq("couple_id", coupleId)
        .order("date", { ascending: false });

      if (month) {
        const { start, end } = getMonthRange(month);
        query = query.gte("date", start).lte("date", end);
      }
      if (type) query = query.eq("type", type);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (paidBy) query = query.eq("paid_by", paidBy);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TransactionWithCategory[];
    },
    enabled: !!coupleId,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TransactionUpdate }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
