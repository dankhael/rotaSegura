import { z } from "zod";

export const QR_CODE_MAX_BYTES = 271;

export const DonationChannelTypeSchema = z.enum(["PIX_KEY", "QR_CODE", "EXTERNAL_LINK"], {
  errorMap: () => ({
    message: "channelType deve ser um de: PIX_KEY, QR_CODE, EXTERNAL_LINK",
  }),
});

const donationChannelBaseSchema = z.object({
  title: z
    .string({ required_error: "title e obrigatorio" })
    .trim()
    .min(1, "title nao pode ser vazio")
    .max(255, "title deve ter no maximo 255 caracteres"),
  description: z
    .string({ required_error: "description e obrigatoria" })
    .trim()
    .min(1, "description nao pode ser vazia")
    .max(1000, "description deve ter no maximo 1000 caracteres"),
  channelType: DonationChannelTypeSchema,
  channelValue: z
    .string({ required_error: "channelValue e obrigatorio" })
    .trim()
    .min(1, "channelValue nao pode ser vazio")
    .max(2048, "channelValue deve ter no maximo 2048 caracteres"),
});

const paginationSchemaBase = z.object({
  page: z.coerce
    .number({ invalid_type_error: "page deve ser um numero" })
    .int()
    .positive()
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "limit deve ser um numero" })
    .int()
    .positive()
    .max(100, "limit maximo e 100")
    .default(20),
});

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateChannelValue(
  data: { channelType?: string; channelValue?: string },
  ctx: z.RefinementCtx,
) {
  if (
    data.channelType === "QR_CODE" &&
    data.channelValue &&
    byteLength(data.channelValue) > QR_CODE_MAX_BYTES
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["channelValue"],
      message: `channelValue deve ter no maximo ${QR_CODE_MAX_BYTES} bytes para QR Code`,
    });
    return;
  }

  if (data.channelType !== "EXTERNAL_LINK" || !data.channelValue || isHttpUrl(data.channelValue)) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["channelValue"],
    message: "channelValue deve comecar com http ou https",
  });
}

export const createDonationChannelSchema =
  donationChannelBaseSchema.superRefine(validateChannelValue);

export const updateDonationChannelSchema = donationChannelBaseSchema
  .partial()
  .superRefine(validateChannelValue);

export const paginationSchema = paginationSchemaBase;

export type CreateDonationChannelInput = z.infer<typeof createDonationChannelSchema>;
export type UpdateDonationChannelInput = z.infer<typeof updateDonationChannelSchema>;
