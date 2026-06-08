import type { DonationChannelType, DonationPoint } from "@/types/donation";

export type DonationFormState = {
  title: string;
  description: string;
  channelType: DonationChannelType;
  channelValue: string;
};

export type DonationFieldErrors = Partial<Record<keyof DonationFormState, string>>;

export type DonationPayload = {
  title: string;
  description: string;
  channelType: DonationChannelType;
  channelValue: string;
};

export const DONATION_CHANNEL_TYPES: Array<{ value: DonationChannelType; label: string }> = [
  { value: "PIX_KEY", label: "Chave PIX" },
  { value: "QR_CODE", label: "QR Code" },
  { value: "EXTERNAL_LINK", label: "Link externo" },
];

export const EMPTY_DONATION_FORM: DonationFormState = {
  title: "",
  description: "",
  channelType: "PIX_KEY",
  channelValue: "",
};

export function donationChannelLabel(type: DonationChannelType): string {
  return DONATION_CHANNEL_TYPES.find((item) => item.value === type)?.label ?? "Canal";
}

export function donationChannelValueLabel(type: DonationChannelType): string {
  const labels: Record<DonationChannelType, string> = {
    PIX_KEY: "Chave PIX",
    QR_CODE: "Conteúdo do QR Code",
    EXTERNAL_LINK: "Link de doação",
  };

  return labels[type];
}

export function donationChannelPlaceholder(type: DonationChannelType): string {
  const placeholders: Record<DonationChannelType, string> = {
    PIX_KEY: "ex: doacoes@rotasegura.org",
    QR_CODE: "ex: https://instituicao.org/doar ou chave PIX",
    EXTERNAL_LINK: "ex: https://instituicao.org/doar",
  };

  return placeholders[type];
}

export function donationPointToFormState(point: DonationPoint): DonationFormState {
  return {
    title: point.title,
    description: point.description,
    channelType: point.channelType,
    channelValue: point.channelValue,
  };
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function qrCodeByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function validateDonationForm(form: DonationFormState): DonationFieldErrors {
  const errors: DonationFieldErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const channelValue = form.channelValue.trim();

  if (!title) errors.title = "Informe o título.";
  if (title.length > 255) errors.title = "Use no máximo 255 caracteres.";

  if (!description) errors.description = "Informe a descrição.";
  if (description.length > 1000) errors.description = "Use no máximo 1000 caracteres.";

  if (!DONATION_CHANNEL_TYPES.some((item) => item.value === form.channelType)) {
    errors.channelType = "Selecione um tipo válido.";
  }

  if (!channelValue) {
    errors.channelValue = `Informe ${donationChannelValueLabel(form.channelType).toLowerCase()}.`;
  }

  if (channelValue && form.channelType === "EXTERNAL_LINK" && !isValidUrl(channelValue)) {
    errors.channelValue = "Informe uma URL válida começando com http ou https.";
  }

  if (channelValue && form.channelType === "QR_CODE" && qrCodeByteLength(channelValue) > 272) {
    errors.channelValue = "Conteúdo do QR Code deve ter no máximo 272 bytes.";
  }

  return errors;
}

export function hasDonationFieldErrors(errors: DonationFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function buildDonationPayload(form: DonationFormState): DonationPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    channelType: form.channelType,
    channelValue: form.channelValue.trim(),
  };
}
