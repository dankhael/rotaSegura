import type { SupportPoint, SupportPointType } from "@/types/support-point";

export type SupportPointFormState = {
  name: string;
  type: SupportPointType;
  capacity: string;
  latitude: string;
  longitude: string;
};

export type SupportPointFieldErrors = Partial<Record<keyof SupportPointFormState, string>>;

export type SupportPointPayload = {
  name: string;
  type: SupportPointType;
  latitude: number;
  longitude: number;
  capacity?: number | null;
};

export const SUPPORT_POINT_TYPES: Array<{ value: SupportPointType; label: string }> = [
  { value: "SHELTER", label: "Abrigo" },
  { value: "MEDICAL", label: "Atendimento médico" },
  { value: "SUPPLY", label: "Suprimentos" },
  { value: "OTHER", label: "Outro" },
];

export const EMPTY_SUPPORT_POINT_FORM: SupportPointFormState = {
  name: "",
  type: "SHELTER",
  capacity: "",
  latitude: "",
  longitude: "",
};

export function supportPointTypeLabel(type: SupportPointType): string {
  return SUPPORT_POINT_TYPES.find((item) => item.value === type)?.label ?? "Outro";
}

export function formatSupportPointCapacity(capacity: number | null): string {
  return capacity === null ? "Não informada" : `${capacity} pessoas`;
}

export function supportPointToFormState(point: SupportPoint): SupportPointFormState {
  return {
    name: point.name,
    type: point.type,
    capacity: point.capacity === null ? "" : String(point.capacity),
    latitude: String(point.latitude),
    longitude: String(point.longitude),
  };
}

function parseCoordinate(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function validateSupportPointForm(form: SupportPointFormState): SupportPointFieldErrors {
  const errors: SupportPointFieldErrors = {};
  const name = form.name.trim();
  const latitude = parseCoordinate(form.latitude);
  const longitude = parseCoordinate(form.longitude);
  const capacity = Number(form.capacity.trim());

  if (!name) errors.name = "Informe o nome.";
  if (name.length > 255) errors.name = "Use no máximo 255 caracteres.";

  if (!SUPPORT_POINT_TYPES.some((item) => item.value === form.type)) {
    errors.type = "Selecione um tipo válido.";
  }

  if (!form.latitude.trim() || Number.isNaN(latitude)) {
    errors.latitude = "Informe uma latitude válida.";
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = "Latitude deve estar entre -90 e 90.";
  }

  if (!form.longitude.trim() || Number.isNaN(longitude)) {
    errors.longitude = "Informe uma longitude válida.";
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = "Longitude deve estar entre -180 e 180.";
  }

  if (form.capacity.trim()) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      errors.capacity = "Capacidade deve ser um número inteiro positivo.";
    }
  }

  return errors;
}

export function hasSupportPointFieldErrors(errors: SupportPointFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function buildSupportPointPayload(
  form: SupportPointFormState,
  editing: boolean,
): SupportPointPayload {
  const payload: SupportPointPayload = {
    name: form.name.trim(),
    type: form.type,
    latitude: parseCoordinate(form.latitude),
    longitude: parseCoordinate(form.longitude),
  };

  if (form.capacity.trim()) {
    payload.capacity = Number(form.capacity.trim());
  } else if (editing) {
    payload.capacity = null;
  }

  return payload;
}
