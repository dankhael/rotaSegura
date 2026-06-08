import {
  EMPTY_SUPPORT_POINT_FORM,
  type SupportPointFieldErrors,
  type SupportPointPayload,
} from "@/lib/support-points/form";
import type { ApiError, PaginatedResponse, SupportPoint } from "@/types/support-point";

type ApiFieldError = {
  field: string;
  message: string;
};

export class SupportPointApiError extends Error {
  fieldErrors: SupportPointFieldErrors;

  constructor(message: string, fieldErrors: SupportPointFieldErrors = {}) {
    super(message);
    this.name = "SupportPointApiError";
    this.fieldErrors = fieldErrors;
  }
}

function mapApiErrors(details: unknown): SupportPointFieldErrors {
  if (!Array.isArray(details)) return {};

  return details.reduce<SupportPointFieldErrors>((acc, detail: unknown) => {
    const fieldError = detail as ApiFieldError;
    if (fieldError.field in EMPTY_SUPPORT_POINT_FORM) {
      acc[fieldError.field as keyof typeof EMPTY_SUPPORT_POINT_FORM] = fieldError.message;
    }
    return acc;
  }, {});
}

async function toApiError(response: Response, fallback: string): Promise<SupportPointApiError> {
  try {
    const body = (await response.json()) as ApiError;
    return new SupportPointApiError(body.error || fallback, mapApiErrors(body.details));
  } catch {
    return new SupportPointApiError(fallback);
  }
}

export async function fetchSupportPoints(): Promise<SupportPoint[]> {
  const response = await fetch("/api/support-points?limit=100");
  if (!response.ok) {
    throw await toApiError(response, "Não foi possível carregar os locais.");
  }

  const body = (await response.json()) as PaginatedResponse<SupportPoint>;
  return body.data ?? [];
}

export async function saveSupportPoint(
  payload: SupportPointPayload,
  id?: string,
): Promise<SupportPoint> {
  const response = await fetch(id ? `/api/support-points/${id}` : "/api/support-points", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível salvar o local. Tente novamente.");
  }

  return response.json() as Promise<SupportPoint>;
}

export async function deleteSupportPoint(id: string): Promise<void> {
  const response = await fetch(`/api/support-points/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível remover o local. Tente novamente.");
  }
}
