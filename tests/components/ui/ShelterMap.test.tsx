import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("leaflet/dist/leaflet.css", () => ({}));

vi.mock("leaflet", () => ({
  default: { icon: vi.fn(() => ({})) },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useMapEvents: () => null,
}));

import ShelterMap from "@/components/ui/ShelterMap";

describe("ShelterMap", () => {
  it("renders the leaflet map container with the OSM tile layer", () => {
    render(<ShelterMap />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("does not render a marker before the user clicks", () => {
    const { container } = render(<ShelterMap />);
    expect(container.querySelector("[data-testid='map-container']")?.textContent).toBe("");
  });
});
