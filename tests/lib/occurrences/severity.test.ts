import { describe, it, expect } from "vitest";

import { occurrenceSeverity } from "@/lib/occurrences/severity";

describe("occurrenceSeverity", () => {
  it("incêndio confirmado e corroborado é HIGH", () => {
    expect(
      occurrenceSeverity({
        type: "FIRE",
        status: "CONFIRMED",
        reportCount: 4,
        uniqueDeviceCount: 3,
      }),
    ).toBe("HIGH");
  });

  it("alagamento confirmado com muitos relatos sobe para HIGH", () => {
    expect(
      occurrenceSeverity({
        type: "FLOOD",
        status: "CONFIRMED",
        reportCount: 6,
        uniqueDeviceCount: 5,
      }),
    ).toBe("HIGH");
  });

  it("incêndio pendente isolado é MEDIUM (risco do tipo)", () => {
    expect(
      occurrenceSeverity({ type: "FIRE", status: "PENDING", reportCount: 1, uniqueDeviceCount: 1 }),
    ).toBe("MEDIUM");
  });

  it("alagamento pendente isolado é MEDIUM", () => {
    expect(
      occurrenceSeverity({
        type: "FLOOD",
        status: "PENDING",
        reportCount: 1,
        uniqueDeviceCount: 1,
      }),
    ).toBe("MEDIUM");
  });

  it("obstrução pendente isolada é LOW", () => {
    expect(
      occurrenceSeverity({
        type: "OBSTRUCTION",
        status: "PENDING",
        reportCount: 1,
        uniqueDeviceCount: 1,
      }),
    ).toBe("LOW");
  });
});
