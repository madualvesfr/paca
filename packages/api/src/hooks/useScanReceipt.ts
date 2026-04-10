import { useMutation } from "@tanstack/react-query";
import { supabase } from "../supabase";

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

export function useScanReceipt() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<ScanResult> => {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { image: imageBase64 },
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useScanStatement() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<ScanBatchResult> => {
      const { data, error } = await supabase.functions.invoke("scan-statement", {
        body: { image: imageBase64 },
      });

      if (error) throw error;
      return data;
    },
  });
}
