import { describe, it, expect } from "vitest";

import { buildOccurrenceSummary, type SummaryWindow } from "@/lib/occurrences/summary";
import type { SummarizableOccurrence } from "@/types/occurrence-summary";
import { makeSummarizable } from "../../factories/occurrence";

const NOW = new Date("2026-06-06T12:00:00.000Z");
const START = new Date("2026-05-30T12:00:00.000Z");

function build(
  current: SummarizableOccurrence[],
  previous: SummarizableOccurrence[] = [],
): ReturnType<typeof buildOccurrenceSummary> {
  const window: SummaryWindow = { current, previous, period: "7d", start: START, now: NOW };
  return buildOccurrenceSummary(window);
}

describe("buildOccurrenceSummary", () => {
  it("retorna resumo vazio para lista vazia", () => {
    const summary = build([]);
    expect(summary.total).toBe(0);
    expect(summary.byStatus).toEqual({ pending: 0, confirmed: 0 });
    expect(summary.byType).toEqual([]);
    expect(summary.regions).toEqual([]);
    expect(summary.recent).toEqual([]);
    expect(summary.period).toBe("7d");
  });

  it("conta total, status, tipo (ordenado) e gravidade", () => {
    const summary = build([
      makeSummarizable({
        id: "a",
        type: "FIRE",
        status: "CONFIRMED",
        reportCount: 3,
        uniqueDeviceCount: 3,
      }),
      makeSummarizable({ id: "b", type: "FLOOD", status: "PENDING" }),
      makeSummarizable({ id: "c", type: "FLOOD", status: "PENDING" }),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.byStatus).toEqual({ pending: 2, confirmed: 1 });
    expect(summary.byType).toEqual([
      { type: "FLOOD", total: 2 },
      { type: "FIRE", total: 1 },
    ]);
    expect(summary.bySeverity.high).toBe(1); // FIRE confirmada
  });

  it("agrupa por bairro", () => {
    const summary = build([
      makeSummarizable({ id: "a", centroidLatitude: -8.073, centroidLongitude: -34.91 }),
      makeSummarizable({ id: "b", centroidLatitude: -8.118, centroidLongitude: -34.902 }),
    ]);

    const names = summary.regions.map((region) => region.region);
    expect(names).toContain("Afogados");
    expect(names).toContain("Boa Viagem");
  });

  it("recentes ordenadas por lastReportedAt desc e capadas em 8", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeSummarizable({
        id: `o${i}`,
        lastReportedAt: new Date(NOW.getTime() - i * 60_000).toISOString(),
      }),
    );

    const summary = build(rows);

    expect(summary.recent).toHaveLength(8);
    expect(summary.recent[0].id).toBe("o0");
  });

  it("mapPoints carregam coordenadas da ocorrência", () => {
    const summary = build([
      makeSummarizable({ id: "a", centroidLatitude: -8.05, centroidLongitude: -34.9 }),
    ]);
    expect(summary.mapPoints[0]).toMatchObject({ id: "a", latitude: -8.05, longitude: -34.9 });
  });

  it("tendência usa a janela anterior", () => {
    const summary = build(
      [makeSummarizable({ id: "a" }), makeSummarizable({ id: "b" })],
      [makeSummarizable({ id: "x" })],
    );
    expect(summary.trend.total).toBe(1);
  });
});
