import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Captura as props passadas ao ShelterMap sem carregar o Leaflet.
vi.mock("next/dynamic", () => ({
  default: () =>
    function ShelterMapStub(props: { occurrences: unknown[]; supportPoints: unknown[] }) {
      return (
        <div
          data-testid="shelter-map"
          data-occ={props.occurrences.length}
          data-sup={props.supportPoints.length}
        />
      );
    },
}));

vi.mock("@/lib/hooks/use-support-points", () => ({
  useSupportPoints: () => ({
    supportPoints: [makeSupportPoint({ id: "a" }), makeSupportPoint({ id: "b" })],
    hasError: false,
  }),
}));

import { DashboardMap } from "@/components/admin/dashboard/dashboard-map";
import type { MapPoint } from "@/types/occurrence-summary";
import { makeSupportPoint } from "../../factories/support-point";

const POINTS: MapPoint[] = [
  {
    id: "o1",
    type: "FLOOD",
    status: "PENDING",
    latitude: -8.05,
    longitude: -34.9,
    reportCount: 1,
    uniqueDeviceCount: 1,
    lastReportedAt: "2026-06-06T10:00:00.000Z",
  },
  {
    id: "o2",
    type: "FIRE",
    status: "CONFIRMED",
    latitude: -8.06,
    longitude: -34.91,
    reportCount: 3,
    uniqueDeviceCount: 3,
    lastReportedAt: "2026-06-06T11:00:00.000Z",
  },
];

describe("DashboardMap", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passa ocorrências e pontos de apoio para o mapa", () => {
    render(<DashboardMap points={POINTS} />);

    const map = screen.getByTestId("shelter-map");
    expect(map).toHaveAttribute("data-occ", "2");
    expect(map).toHaveAttribute("data-sup", "2");
  });

  it("oculta a camada de pontos de apoio mantendo as ocorrências", () => {
    render(<DashboardMap points={POINTS} />);

    fireEvent.click(screen.getByRole("button", { name: /Pontos de apoio/ }));

    const map = screen.getByTestId("shelter-map");
    expect(map).toHaveAttribute("data-sup", "0");
    expect(map).toHaveAttribute("data-occ", "2");
  });

  it("oculta a camada de ocorrências", () => {
    render(<DashboardMap points={POINTS} />);

    fireEvent.click(screen.getByRole("button", { name: /Ocorrências/ }));

    expect(screen.getByTestId("shelter-map")).toHaveAttribute("data-occ", "0");
  });
});
