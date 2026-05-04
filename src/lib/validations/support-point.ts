// src/lib/validations/support-point.ts
import { z } from "zod";

// ─── Enum ─────────────────────────────────────────────────────────────────────
export const SupportPointTypeSchema = z.enum(["SHELTER", "MEDICAL", "SUPPLY", "OTHER"], {
  errorMap: () => ({
    message: "type deve ser um de: SHELTER, MEDICAL, SUPPLY, OTHER",
  }),
});

// ─── Create ───────────────────────────────────────────────────────────────────
export const createSupportPointSchema = z.object({
  name: z
    .string({ required_error: "name é obrigatório" })
    .min(1, "name não pode ser vazio")
    .max(255, "name deve ter no máximo 255 caracteres"),
  type: SupportPointTypeSchema,
  latitude: z
    .number({
      required_error: "latitude é obrigatória",
      invalid_type_error: "latitude deve ser um número",
    })
    .min(-90, "latitude deve ser >= -90")
    .max(90, "latitude deve ser <= 90"),
  longitude: z
    .number({
      required_error: "longitude é obrigatória",
      invalid_type_error: "longitude deve ser um número",
    })
    .min(-180, "longitude deve ser >= -180")
    .max(180, "longitude deve ser <= 180"),
  capacity: z
    .number({ invalid_type_error: "capacity deve ser um número inteiro" })
    .int("capacity deve ser um número inteiro")
    .positive("capacity deve ser positivo")
    .optional(),
});

export type CreateSupportPointInput = z.infer<typeof createSupportPointSchema>;

// ─── Update (PATCH — todos os campos opcionais, capacity também anulável) ─────
//
// .partial() torna os campos opcionais (undefined) mas não anuláveis.
// capacity: null é o sinal explícito de "remover o valor", por isso sobrescrevemos
// esse campo para aceitar null além de undefined.
export const updateSupportPointSchema = createSupportPointSchema.partial().extend({
  capacity: z
    .number({ invalid_type_error: "capacity deve ser um número inteiro" })
    .int("capacity deve ser um número inteiro")
    .positive("capacity deve ser positivo")
    .nullable()
    .optional(),
});

export type UpdateSupportPointInput = z.infer<typeof updateSupportPointSchema>;

// ─── Paginação (query params) ─────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "page deve ser um número" })
    .int()
    .positive()
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "limit deve ser um número" })
    .int()
    .positive()
    .max(100, "limit máximo é 100")
    .default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
