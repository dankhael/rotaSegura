import type { SupportPoint } from "@/types/support-point";

/** Ponto de apoio válido para testes; sobrescreva só os campos relevantes. */
export function makeSupportPoint(overrides: Partial<SupportPoint> = {}): SupportPoint {
  return {
    id: "sp-1",
    name: "Abrigo Central",
    type: "SHELTER",
    latitude: -8.11,
    longitude: -34.9,
    capacity: 120,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}
