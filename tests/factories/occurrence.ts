import type { Occurrence } from "@/types/occurrence";
import type { SummarizableOccurrence } from "@/types/occurrence-summary";

/** Linha de ocorrência para o builder do resumo; sobrescreva o que importar. */
export function makeSummarizable(
  overrides: Partial<SummarizableOccurrence> = {},
): SummarizableOccurrence {
  return {
    id: "occ-1",
    type: "OTHER",
    status: "PENDING",
    centroidLatitude: -8.05,
    centroidLongitude: -34.9,
    reportCount: 1,
    uniqueDeviceCount: 1,
    firstReportedAt: "2026-06-06T10:00:00.000Z",
    lastReportedAt: "2026-06-06T10:00:00.000Z",
    confirmedAt: null,
    ...overrides,
  };
}

/** Ocorrência válida para testes; sobrescreva só os campos relevantes ao caso. */
export function makeOccurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: "occ-1",
    type: "FLOOD",
    status: "CONFIRMED",
    centroidLatitude: -8.05,
    centroidLongitude: -34.9,
    reportCount: 3,
    uniqueDeviceCount: 2,
    firstReportedAt: "2026-05-01T10:00:00.000Z",
    lastReportedAt: "2026-05-02T10:00:00.000Z",
    confirmedAt: "2026-05-02T11:00:00.000Z",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-02T11:00:00.000Z",
    ...overrides,
  };
}
