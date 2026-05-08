import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { FinanceScope } from "@paca/shared";

interface ScanResult {
  amount: number;
  currency?: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
  confidence: number;
}

interface ScanBatchResult {
  transactions: ScanResult[];
  primary_currency?: string;
  duplicates?: string[];
}

interface ScanInput {
  image: string;
  mode?: FinanceScope;
}

export function useScanReceipt() {
  return useMutation({
    mutationFn: async (input: string | ScanInput): Promise<ScanResult> => {
      const payload = typeof input === "string"
        ? { image: input, mode: "couple" as FinanceScope }
        : { image: input.image, mode: input.mode ?? "couple" };
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useScanStatement() {
  return useMutation({
    mutationFn: async (input: string | ScanInput): Promise<ScanBatchResult> => {
      const payload = typeof input === "string"
        ? { image: input, mode: "couple" as FinanceScope }
        : { image: input.image, mode: input.mode ?? "couple" };
      const { data, error } = await supabase.functions.invoke("scan-statement", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
  });
}
