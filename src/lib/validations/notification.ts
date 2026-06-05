import { z } from "zod";

// Estrutura devolvida pelo `PushManager.subscribe()` no navegador. Mantemos os
// campos `endpoint`/`keys.p256dh`/`keys.auth` exatamente como saem do browser
// porque a lib `web-push` reaceita o mesmo formato no envio.
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("endpoint deve ser uma URL válida"),
  keys: z.object({
    p256dh: z.string().min(1, "keys.p256dh é obrigatório"),
    auth: z.string().min(1, "keys.auth é obrigatório"),
  }),
});

export const createPushSubscriptionSchema = z.object({
  subscription: pushSubscriptionSchema,
  // Identidade anônima — alinhada ao deviceId já usado em /api/reports.
  // Aceitar admin (userId via JWT) é responsabilidade do endpoint, não do schema.
  deviceId: z.string().uuid("deviceId deve ser um UUID válido").optional(),
  latitude: z
    .number({
      required_error: "latitude é obrigatória",
      invalid_type_error: "latitude deve ser um número",
    })
    .min(-90)
    .max(90),
  longitude: z
    .number({
      required_error: "longitude é obrigatória",
      invalid_type_error: "longitude deve ser um número",
    })
    .min(-180)
    .max(180),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url("endpoint deve ser uma URL válida"),
});

export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
