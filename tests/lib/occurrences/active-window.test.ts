import { describe, it, expect } from "vitest";

import { activeWindowCutoff } from "@/lib/occurrences/active-window";

const NOW = new Date("2026-06-10T12:00:00.000Z");

describe("activeWindowCutoff", () => {
  it("1440 min (default) → corte 24h atrás", () => {
    const cutoff = activeWindowCutoff(1440, NOW);
    expect(cutoff.toISOString()).toBe("2026-06-09T12:00:00.000Z");
  });

  it("60 min → corte 1h atrás", () => {
    const cutoff = activeWindowCutoff(60, NOW);
    expect(cutoff.toISOString()).toBe("2026-06-10T11:00:00.000Z");
  });
});
