import {
  EMPTY_DONATION_FORM,
  type DonationFieldErrors,
  type DonationPayload,
} from "@/lib/donations/form";
import type { ApiError, DonationPoint, PaginatedResponse } from "@/types/donation";

type ApiFieldError = {
  field: string;
  message: string;
};

export class DonationApiError extends Error {
  fieldErrors: DonationFieldErrors;

  constructor(message: string, fieldErrors: DonationFieldErrors = {}) {
    super(message);
    this.name = "DonationApiError";
    this.fieldErrors = fieldErrors;
  }
}

function mapApiErrors(details: unknown): DonationFieldErrors {
  if (!Array.isArray(details)) return {};

  return details.reduce<DonationFieldErrors>((acc, detail: unknown) => {
    const fieldError = detail as ApiFieldError;
    if (fieldError.field in EMPTY_DONATION_FORM) {
      acc[fieldError.field as keyof typeof EMPTY_DONATION_FORM] = fieldError.message;
    }
    return acc;
  }, {});
}

async function toApiError(response: Response, fallback: string): Promise<DonationApiError> {
  try {
    const body = (await response.json()) as ApiError;
    return new DonationApiError(body.error || fallback, mapApiErrors(body.details));
  } catch {
    return new DonationApiError(fallback);
  }
}

export async function fetchDonationPoints(): Promise<DonationPoint[]> {
  const response = await fetch("/api/donations?limit=100");
  if (!response.ok) {
    throw await toApiError(response, "Não foi possível carregar os canais.");
  }

  const body = (await response.json()) as PaginatedResponse<DonationPoint>;
  return body.data ?? [];
}

export async function saveDonationPoint(
  payload: DonationPayload,
  id?: string,
): Promise<DonationPoint> {
  const response = await fetch(id ? `/api/donations/${id}` : "/api/donations", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível salvar o canal. Tente novamente.");
  }

  return response.json() as Promise<DonationPoint>;
}

export async function deleteDonationPoint(id: string): Promise<void> {
  const response = await fetch(`/api/donations/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível remover o canal. Tente novamente.");
  }
}
