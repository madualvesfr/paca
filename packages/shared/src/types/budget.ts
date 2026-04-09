export interface Budget {
  id: string;
  couple_id: string;
  month: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetInsert {
  couple_id: string;
  month: string;
  total_amount: number;
}

export interface BudgetUpdate {
  total_amount?: number;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategoryInsert {
  budget_id: string;
  category_id: string;
  allocated_amount: number;
}

export interface BudgetWithCategories extends Budget {
  categories: (BudgetCategory & {
    category: {
      name: string;
      icon: string;
      color: string;
    };
    spent: number;
  })[];
}
