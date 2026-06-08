import { describe, it, expect } from "vitest";

import { periodRange } from "@/lib/occurrences/period";

const NOW = new Date("2026-06-06T12:00:00.000Z");

describe("periodRange", () => {
  it("7d → janela atual de 7 dias e anterior de mesmo tamanho", () => {
    const { start, previousStart } = periodRange("7d", NOW);
    expect(start.toISOString()).toBe("2026-05-30T12:00:00.000Z");
    expect(previousStart.toISOString()).toBe("2026-05-23T12:00:00.000Z");
  });

  it("30d → janela de 30 dias e anterior de 30 dias", () => {
    const { start, previousStart } = periodRange("30d", NOW);
    expect(start.toISOString()).toBe("2026-05-07T12:00:00.000Z");
    expect(previousStart.toISOString()).toBe("2026-04-07T12:00:00.000Z");
  });

  it("today → início do dia UTC e véspera", () => {
    const { start, previousStart } = periodRange("today", NOW);
    expect(start.toISOString()).toBe("2026-06-06T00:00:00.000Z");
    expect(previousStart.toISOString()).toBe("2026-06-05T00:00:00.000Z");
  });
});
