import { z } from "zod";

export const transactionInsertSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição obrigatória").max(200),
  category_id: z.string().uuid("Categoria inválida"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: z.string().max(500).nullable().optional(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: z.string().nullable().optional(),
});

export const transactionUpdateSchema = transactionInsertSchema.partial();

export type TransactionInsertInput = z.infer<typeof transactionInsertSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
