import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Evita carregar o Leaflet (mapa dinâmico) nos testes do dashboard.
vi.mock("@/components/admin/dashboard/dashboard-map", () => ({
  DashboardMap: () => <div data-testid="dashboard-map" />,
}));

import { OccurrenceDashboard } from "@/components/admin/dashboard/occurrence-dashboard";
import { makeSummary } from "../../factories/occurrence-summary";

type FetchResult = { ok: boolean; json: () => Promise<unknown> };

function stubFetch(results: FetchResult[]): ReturnType<typeof vi.fn> {
  let last = results[results.length - 1];
  const fetchMock = vi.fn(() => {
    if (results.length > 0) last = results.shift() as FetchResult;
    return Promise.resolve(last);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ok = (summary: unknown): FetchResult => ({ ok: true, json: () => Promise.resolve(summary) });

describe("OccurrenceDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renderiza cards, donut, tipos, regiões, recentes e mapa", async () => {
    stubFetch([ok(makeSummary())]);

    render(<OccurrenceDashboard />);

    expect(await screen.findByText("Total de ocorrências")).toBeInTheDocument();
    expect(screen.getByText("Gravidade alta")).toBeInTheDocument();
    expect(screen.getByText("Situação em tempo real")).toBeInTheDocument();
    expect(screen.getByText("Por tipo de ocorrência")).toBeInTheDocument();
    expect(screen.getByText("Regiões mais afetadas")).toBeInTheDocument();
    expect(screen.getByText("Ocorrências recentes")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-map")).toBeInTheDocument();
  });

  it("clicar numa barra de tipo aplica o filtro de tipo", async () => {
    const fetchMock = stubFetch([ok(makeSummary())]);

    render(<OccurrenceDashboard />);
    await screen.findByText("Por tipo de ocorrência");

    fireEvent.click(screen.getByRole("button", { name: /Alagamento/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/occurrences/summary?type=FLOOD&period=7d",
        expect.anything(),
      ),
    );
  });

  it("alternar o período refaz a busca", async () => {
    const fetchMock = stubFetch([ok(makeSummary())]);

    render(<OccurrenceDashboard />);
    await screen.findByText("Total de ocorrências");

    fireEvent.click(screen.getByRole("radio", { name: "30 dias" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/occurrences/summary?period=30d",
        expect.anything(),
      ),
    );
  });

  it("mostra estado vazio quando não há ocorrências", async () => {
    stubFetch([ok(makeSummary({ total: 0 }))]);

    render(<OccurrenceDashboard />);

    expect(await screen.findByText("Nenhuma ocorrência encontrada")).toBeInTheDocument();
  });

  it("mostra erro com tentar novamente e recupera no retry", async () => {
    stubFetch([{ ok: false, json: () => Promise.resolve({}) }, ok(makeSummary())]);

    render(<OccurrenceDashboard />);

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retry);

    expect(await screen.findByText("Total de ocorrências")).toBeInTheDocument();
  });
});
