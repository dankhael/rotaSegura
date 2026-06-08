import { z } from "zod";

export const OccurrenceTypeSchema = z.enum(
  ["FLOOD", "FIRE", "LANDSLIDE", "ACCIDENT", "OBSTRUCTION", "OTHER"],
  {
    errorMap: () => ({
      message: "type deve ser um de: FLOOD, FIRE, LANDSLIDE, ACCIDENT, OBSTRUCTION, OTHER",
    }),
  },
);

export type OccurrenceType = z.infer<typeof OccurrenceTypeSchema>;

export const OccurrenceStatusSchema = z.enum(["PENDING", "CONFIRMED"], {
  errorMap: () => ({ message: "status deve ser PENDING ou CONFIRMED" }),
});

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

export const occurrenceListQuerySchema = paginationSchema.extend({
  status: OccurrenceStatusSchema.optional(),
  type: OccurrenceTypeSchema.optional(),
});

export type OccurrenceListQuery = z.infer<typeof occurrenceListQuerySchema>;

export const DashboardPeriodSchema = z.enum(["today", "7d", "30d"], {
  errorMap: () => ({ message: "period deve ser today, 7d ou 30d" }),
});

// Dashboard admin (US10): filtros + período (janela de datas), sem paginação —
// o resumo agrega tudo. `period` tem default para o resumo nunca vir sem janela.
export const occurrenceSummaryQuerySchema = z.object({
  status: OccurrenceStatusSchema.optional(),
  type: OccurrenceTypeSchema.optional(),
  period: DashboardPeriodSchema.default("7d"),
});

export type OccurrenceSummaryQuery = z.infer<typeof occurrenceSummaryQuerySchema>;
