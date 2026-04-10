import { z } from "zod";

export const budgetInsertSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido (formato: YYYY-MM-01)"),
  total_amount: z.number().positive("Valor deve ser maior que zero"),
});

export const budgetCategorySchema = z.object({
  category_id: z.string().uuid("Categoria inválida"),
  allocated_amount: z.number().min(0, "Valor não pode ser negativo"),
});

export const budgetUpdateSchema = z.object({
  total_amount: z.number().positive("Valor deve ser maior que zero").optional(),
  categories: z.array(budgetCategorySchema).optional(),
});

export type BudgetInsertInput = z.infer<typeof budgetInsertSchema>;
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
