export interface Bill {
  id: string;
  couple_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_fixed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  month: string;
  paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillWithPayment extends Bill {
  payment: BillPayment | null;
}

export type BillInsert = Pick<Bill, "couple_id" | "name" | "amount" | "due_day" | "is_fixed">;
