import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock compartilhado: queremos asseverar chamadas em `setView` (testes de
// RecenterOnRequest). Cada teste reseta antes via `setViewMock.mockReset()`.
const setViewMock = vi.fn();

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
  useMap: () => ({ setView: setViewMock, getZoom: () => 13 }),
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

  it("centraliza no focusPoint quando o mapa monta tarde com focusToken já mutado (RS-TK04 deep-link)", () => {
    // Regressão: ShelterMap é dynamic({ ssr: false }) no MapCard. Em janela
    // nova de notificação, o MapCard roda o useEffect do deep-link ANTES do
    // ShelterMap montar, então o mapa nasce com focusToken=1. Antes do fix,
    // RecenterOnRequest fazia useRef(token) e congelava lastTokenRef=1, igual
    // ao corrente — comparação falhava e setView nunca era chamado.
    setViewMock.mockReset();
    render(<ShelterMap focusPoint={{ lat: -8.0011, lng: -34.869 }} focusToken={1} />);
    expect(setViewMock).toHaveBeenCalledWith([-8.0011, -34.869], expect.any(Number));
  });

  it("não centraliza sozinho quando o mapa monta com tokens iniciais zerados", () => {
    // Comportamento original que tem que ser preservado: token=0 + sem
    // posição é o "estado parado". Só pana quando o usuário clica em "Minha
    // localização" e o token vira 1.
    setViewMock.mockReset();
    render(<ShelterMap />);
    expect(setViewMock).not.toHaveBeenCalled();
  });
});
