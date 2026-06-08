import type { OccurrenceSummary } from "@/types/occurrence-summary";

/** Resumo rico do dashboard para testes de hook/componentes. */
export function makeSummary(overrides: Partial<OccurrenceSummary> = {}): OccurrenceSummary {
  return {
    total: 5,
    byStatus: { pending: 3, confirmed: 2 },
    byType: [
      { type: "FLOOD", total: 3 },
      { type: "FIRE", total: 2 },
    ],
    bySeverity: { high: 1, medium: 3, low: 1 },
    regions: [
      { region: "Afogados", total: 3, pending: 2, confirmed: 1 },
      { region: "Madalena", total: 2, pending: 1, confirmed: 1 },
    ],
    timeSeries: [
      { date: "2026-06-05", pending: 1, confirmed: 1, high: 0 },
      { date: "2026-06-06", pending: 2, confirmed: 1, high: 1 },
    ],
    trend: { total: 2, pending: 1, confirmed: 1, high: 0 },
    recent: [
      {
        id: "occ-recent-1",
        type: "FLOOD",
        status: "PENDING",
        severity: "MEDIUM",
        neighborhood: "Afogados",
        reportCount: 2,
        lastReportedAt: "2026-06-06T10:00:00.000Z",
      },
    ],
    avgConfirmationMinutes: 45,
    mapPoints: [
      {
        id: "occ-recent-1",
        type: "FLOOD",
        status: "PENDING",
        latitude: -8.05,
        longitude: -34.9,
        reportCount: 2,
        uniqueDeviceCount: 2,
        lastReportedAt: "2026-06-06T10:00:00.000Z",
      },
    ],
    period: "7d",
    ...overrides,
  };
}
