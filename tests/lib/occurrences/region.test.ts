import { describe, it, expect } from "vitest";

import { occurrenceRegion, REGION_GRID_DEGREES } from "@/lib/occurrences/region";

describe("occurrenceRegion", () => {
  it("rotula o canto sudoeste da célula com hemisférios pt-BR", () => {
    expect(occurrenceRegion(-8.05, -34.9)).toBe("8.05°S, 34.90°O");
  });

  it("usa N/L para coordenadas positivas", () => {
    expect(occurrenceRegion(8.02, 34.97)).toBe("8.00°N, 34.95°L");
  });

  it("agrupa coordenadas próximas na mesma célula", () => {
    const a = occurrenceRegion(-8.05, -34.9);
    const b = occurrenceRegion(-8.04, -34.88);
    expect(a).toBe(b);
  });

  it("separa coordenadas distantes em células diferentes", () => {
    const near = occurrenceRegion(-8.05, -34.9);
    const far = occurrenceRegion(-8.2, -35.0);
    expect(near).not.toBe(far);
    expect(far).toBe("8.20°S, 35.00°O");
  });

  it("expõe o tamanho da grade para reuso", () => {
    expect(REGION_GRID_DEGREES).toBe(0.05);
  });
});
