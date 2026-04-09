export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  couple_id: string;
  paid_by: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string;
  date: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  ai_scanned: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionInsert {
  couple_id: string;
  paid_by: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string;
  date: string;
  notes?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  ai_scanned?: boolean;
}

export interface TransactionUpdate {
  type?: TransactionType;
  amount?: number;
  description?: string;
  category_id?: string;
  date?: string;
  notes?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category: {
    name: string;
    icon: string;
    color: string;
  };
  paid_by_profile: {
    display_name: string;
    avatar_url: string | null;
  };
}
