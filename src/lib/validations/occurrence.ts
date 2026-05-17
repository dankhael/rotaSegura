import { z } from "zod";

export const OccurrenceTypeSchema = z.enum(
  ["FLOOD", "FIRE", "LANDSLIDE", "ACCIDENT", "OBSTRUCTION", "OTHER"],
  {
    errorMap: () => ({
      message: "type deve ser um de: FLOOD, FIRE, LANDSLIDE, ACCIDENT, OBSTRUCTION, OTHER",
    }),
  },
);

export const createOccurrenceSchema = z.object({
  type: OccurrenceTypeSchema,
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
  occurredAt: z.coerce.date().optional(),
});

export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>;

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
