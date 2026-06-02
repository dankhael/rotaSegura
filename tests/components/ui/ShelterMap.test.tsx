import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("leaflet/dist/leaflet.css", () => ({}));

vi.mock("leaflet", () => ({
  default: { icon: vi.fn(() => ({})), divIcon: vi.fn(() => ({})) },
}));

vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useMapEvents: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 13 }),
}));

import ShelterMap from "@/components/ui/ShelterMap";
import { makeSupportPoint } from "../../factories/support-point";

describe("ShelterMap", () => {
  it("renders the leaflet map container with the OSM tile layer", () => {
    render(<ShelterMap />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("does not render the click-to-place marker before the user clicks", () => {
    render(<ShelterMap />);
    expect(screen.queryByText(/Novo ponto selecionado/i)).not.toBeInTheDocument();
  });

  it("renders a marker per support point and labels it by type", () => {
    render(
      <ShelterMap
        supportPoints={[
          makeSupportPoint({ id: "a", name: "Abrigo Central", type: "SHELTER" }),
          makeSupportPoint({ id: "b", name: "UPA Norte", type: "MEDICAL" }),
        ]}
      />,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.getByText("Abrigo Central")).toBeInTheDocument();
    expect(screen.getByText("Atendimento médico")).toBeInTheDocument();
  });

  it("filters support points by type", () => {
    render(
      <ShelterMap
        filter="SHELTER"
        supportPoints={[
          makeSupportPoint({ id: "a", type: "SHELTER" }),
          makeSupportPoint({ id: "b", type: "MEDICAL" }),
        ]}
      />,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });
});
