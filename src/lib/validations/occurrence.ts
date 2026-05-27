import { z } from "zod";

export const OccurrenceTypeSchema = z.enum(
  ["FLOOD", "FIRE", "LANDSLIDE", "ACCIDENT", "OBSTRUCTION", "OTHER"],
  {
    errorMap: () => ({
      message: "type deve ser um de: FLOOD, FIRE, LANDSLIDE, ACCIDENT, OBSTRUCTION, OTHER",
    }),
  },
);

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
