import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .min(1, "Nome obrigatório")
    .max(50, "Nome muito longo"),
  avatar_url: z.string().url("URL inválida").nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const signupSchema = loginSchema.extend({
  display_name: z
    .string()
    .min(1, "Nome obrigatório")
    .max(50, "Nome muito longo"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
