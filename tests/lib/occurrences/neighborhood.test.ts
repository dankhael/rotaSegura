import { describe, it, expect } from "vitest";

import { nearestNeighborhood } from "@/lib/occurrences/neighborhood";

describe("nearestNeighborhood", () => {
  it("mapeia a coordenada ao bairro mais próximo", () => {
    expect(nearestNeighborhood(-8.073, -34.91)).toBe("Afogados");
  });

  it("resolve outro bairro conhecido", () => {
    expect(nearestNeighborhood(-8.118, -34.902)).toBe("Boa Viagem");
  });

  it("cai no rótulo de grade quando longe de qualquer bairro", () => {
    // Centro de São Paulo: longe de Recife → fallback occurrenceRegion (tem °).
    expect(nearestNeighborhood(-23.55, -46.63)).toMatch(/°/);
  });
});
