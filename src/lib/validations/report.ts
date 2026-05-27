import { z } from "zod";

import { OccurrenceTypeSchema, paginationSchema } from "@/lib/validations/occurrence";

export const ReportTypeSchema = OccurrenceTypeSchema;

export const createReportSchema = z.object({
  type: ReportTypeSchema,
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
  // Não aceitamos datas futuras: recomputeAggregates usa MAX(occurredAt) para
  // lastReportedAt, então um occurredAt no futuro manteria a ocorrência "fresca"
  // indefinidamente dentro de qualquer janela de confirmação.
  occurredAt: z.coerce
    .date()
    .refine((d) => d <= new Date(), "occurredAt não pode estar no futuro")
    .optional(),
  // UUID gerado pelo cliente (localStorage). Ausência é aceita, mas exclui o relato
  // do cálculo de uniqueDeviceCount (não conta para o threshold de confirmação).
  deviceId: z.string().uuid("deviceId deve ser um UUID válido").optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportListQuerySchema = paginationSchema.extend({
  type: ReportTypeSchema.optional(),
  occurrenceId: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
