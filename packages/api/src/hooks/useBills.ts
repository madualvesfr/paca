import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { BillWithPayment, BillInsert } from "@paca/shared";

interface UseBillsOptions {
  coupleId: string;
  month: string;
}

export function useBills(options: UseBillsOptions) {
  const { coupleId, month } = options;

  return useQuery({
    queryKey: ["bills", coupleId, month],
    queryFn: async (): Promise<BillWithPayment[]> => {
      // Fetch all bills for the couple
      const { data: bills, error } = await supabase
        .from("bills")
        .select("*")
        .eq("couple_id", coupleId)
        .order("due_day");

      if (error) throw error;
      if (!bills || bills.length === 0) return [];

      // Fetch payments for this month
      const billIds = bills.map((b) => b.id);
      const { data: payments } = await supabase
        .from("bill_payments")
        .select("*")
        .in("bill_id", billIds)
        .eq("month", month);

      const paymentMap = new Map(
        (payments ?? []).map((p) => [p.bill_id, p])
      );

      return bills.map((bill) => ({
        ...bill,
        payment: paymentMap.get(bill.id) ?? null,
      }));
    },
    enabled: !!coupleId,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: BillInsert) => {
      const { data, error } = await supabase
        .from("bills")
        .insert(bill)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}

export function useToggleBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billId,
      month,
      paid,
      profileId,
    }: {
      billId: string;
      month: string;
      paid: boolean;
      profileId: string;
    }) => {
      // Try to find existing payment
      const { data: existing } = await supabase
        .from("bill_payments")
        .select("id")
        .eq("bill_id", billId)
        .eq("month", month)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("bill_payments")
          .update({
            paid,
            paid_at: paid ? new Date().toISOString() : null,
            paid_by: paid ? profileId : null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("bill_payments")
          .insert({
            bill_id: billId,
            month,
            paid,
            paid_at: paid ? new Date().toISOString() : null,
            paid_by: paid ? profileId : null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}
