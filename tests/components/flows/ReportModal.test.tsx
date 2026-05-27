import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportModal } from "../../../src/components/home/report-modal/modal-report";

vi.mock("@/lib/hooks/use-geolocation", () => ({
  useGeolocation: () => ({
    coords: { lat: -8.05, lng: -34.9, accuracy: 20 },
    source: "device",
    status: "granted",
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock("@/lib/geocoding/getAddressFromCoords", () => ({
  getAddressFromCoords: async () => "Rua Teste, Recife",
}));

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

async function goToConfirmStep() {
  fireEvent.click(screen.getByText("Alagamento"));
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
  expect(await screen.findByText(/confirmar envio/i)).toBeInTheDocument();
}

describe("ReportModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("envia o relato para /api/reports com o payload e deviceId corretos", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ report: {}, occurrence: {}, clustering: {} }, 201));

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("/api/reports");
    expect(init).toMatchObject({ method: "POST" });

    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload).toMatchObject({ type: "FLOOD", latitude: -8.05, longitude: -34.9 });
    expect(payload.deviceId).toEqual(expect.any(String));

    expect(await screen.findByText(/ocorrência enviada/i)).toBeInTheDocument();
  });

  it("mostra feedback de erro quando a API responde com falha", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/erro ao enviar/i)).toBeInTheDocument();
  });

  it("desabilita o botão Continuar enquanto nenhum tipo está selecionado", () => {
    global.fetch = vi.fn();
    render(<ReportModal open onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    fireEvent.click(screen.getByText("Alagamento"));
    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
  });
});
