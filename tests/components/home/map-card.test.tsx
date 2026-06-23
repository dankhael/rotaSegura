import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockShelterMap(props: {
      focusPoint?: { lat: number; lng: number } | null;
      focusToken?: number;
    }) {
      return (
        <div
          data-testid="shelter-map"
          data-focus-lat={props.focusPoint?.lat ?? ""}
          data-focus-lng={props.focusPoint?.lng ?? ""}
          data-focus-token={props.focusToken ?? 0}
        />
      );
    },
}));

vi.mock("@/lib/hooks/use-geolocation", () => ({
  useGeolocation: () => ({
    coords: null,
    source: null,
    status: "granted",
    retry: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-occurrences", () => ({
  useOccurrences: () => ({
    occurrences: [],
    hasError: false,
  }),
}));

vi.mock("@/lib/hooks/use-support-points", () => ({
  useSupportPoints: () => ({
    supportPoints: [],
    hasError: false,
  }),
}));

import { MapCard } from "@/components/home/map-card";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("MapCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("centraliza o mapa no local pesquisado", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        latitude: -8.1258,
        longitude: -34.9006,
        address: "Boa Viagem, Recife, Pernambuco",
      }),
    );

    render(<MapCard />);

    fireEvent.change(screen.getByRole("searchbox", { name: /pesquisar local/i }), {
      target: { value: "Boa Viagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /buscar local/i }));

    await waitFor(() =>
      expect(screen.getByTestId("shelter-map")).toHaveAttribute("data-focus-token", "1"),
    );

    expect(global.fetch).toHaveBeenCalledWith("/api/geocode?q=Boa%20Viagem", expect.any(Object));
    expect(screen.getByTestId("shelter-map")).toHaveAttribute("data-focus-lat", "-8.1258");
    expect(screen.getByTestId("shelter-map")).toHaveAttribute("data-focus-lng", "-34.9006");
    expect(screen.getByText(/Boa Viagem, Recife/i)).toBeInTheDocument();
  });

  it("mostra mensagem quando a busca nao encontra resultado", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Local nao encontrado" }, 404));

    render(<MapCard />);

    fireEvent.change(screen.getByRole("searchbox", { name: /pesquisar local/i }), {
      target: { value: "Lugar inexistente" },
    });
    fireEvent.click(screen.getByRole("button", { name: /buscar local/i }));

    expect(await screen.findByText(/local nao encontrado/i)).toBeInTheDocument();
  });
});
