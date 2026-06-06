import { describe, it, expect } from "vitest";

import {
  averageConfirmationMinutes,
  buildTimeSeries,
  computeTrend,
} from "@/lib/occurrences/summary-trends";
import { makeSummarizable } from "../../factories/occurrence";

const NOW = new Date("2026-06-06T12:00:00.000Z");

describe("buildTimeSeries", () => {
  it("preenche todos os dias do período com zero e conta por status/gravidade", () => {
    const start = new Date("2026-06-04T12:00:00.000Z");
    const rows = [
      makeSummarizable({
        status: "PENDING",
        type: "OTHER",
        firstReportedAt: "2026-06-04T09:00:00.000Z",
      }),
      makeSummarizable({
        status: "CONFIRMED",
        type: "FIRE",
        reportCount: 3,
        uniqueDeviceCount: 3,
        firstReportedAt: "2026-06-06T09:00:00.000Z",
      }),
    ];

    const series = buildTimeSeries(rows, start, NOW);

    expect(series.map((point) => point.date)).toEqual(["2026-06-04", "2026-06-05", "2026-06-06"]);
    expect(series[0]).toMatchObject({ pending: 1, confirmed: 0, high: 0 });
    expect(series[1]).toMatchObject({ pending: 0, confirmed: 0, high: 0 });
    // FIRE confirmada → HIGH.
    expect(series[2]).toMatchObject({ pending: 0, confirmed: 1, high: 1 });
  });
});

describe("computeTrend", () => {
  it("delta é a janela atual menos a anterior", () => {
    const current = [
      makeSummarizable({ id: "a", status: "PENDING" }),
      makeSummarizable({ id: "b", status: "CONFIRMED" }),
    ];
    const previous = [makeSummarizable({ id: "x", status: "PENDING" })];

    const trend = computeTrend(current, previous);

    expect(trend.total).toBe(1);
    expect(trend.pending).toBe(0);
    expect(trend.confirmed).toBe(1);
  });
});

describe("averageConfirmationMinutes", () => {
  it("média entre primeiro relato e confirmação das confirmadas", () => {
    const rows = [
      makeSummarizable({
        status: "CONFIRMED",
        firstReportedAt: "2026-06-06T10:00:00.000Z",
        confirmedAt: "2026-06-06T10:30:00.000Z",
      }),
      makeSummarizable({
        status: "CONFIRMED",
        firstReportedAt: "2026-06-06T10:00:00.000Z",
        confirmedAt: "2026-06-06T11:00:00.000Z",
      }),
      makeSummarizable({ status: "PENDING", confirmedAt: null }),
    ];

    expect(averageConfirmationMinutes(rows)).toBe(45);
  });

  it("null quando não há confirmadas", () => {
    expect(averageConfirmationMinutes([makeSummarizable({ status: "PENDING" })])).toBeNull();
  });
});
