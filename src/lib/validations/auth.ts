import { z } from "zod";

export const UserRoleSchema = z.enum(["ADMIN", "USER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: "email é obrigatório" })
    .trim()
    .toLowerCase()
    .email("email deve ter um formato válido"),
  password: z
    .string({ required_error: "password é obrigatório" })
    .min(1, "password não pode ser vazio"),
});

export type LoginInput = z.infer<typeof loginSchema>;
