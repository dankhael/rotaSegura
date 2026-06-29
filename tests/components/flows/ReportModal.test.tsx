import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(await screen.findByText(/erro ao enviar/i)).toBeInTheDocument();
  });

  it("permite editar o local e envia o relato com as coordenadas escolhidas", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            address: "Boa Viagem, Recife, Pernambuco",
            latitude: -8.1258,
            longitude: -34.9006,
          },
          200,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ report: {}, occurrence: {}, clustering: {} }, 201));

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /editar localização/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /novo endereço/i }), {
      target: { value: "Boa Viagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar endereço/i }));

    expect(await screen.findByText(/Boa Viagem, Recife/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const [geocodeUrl] = vi.mocked(global.fetch).mock.calls[0];
    expect(geocodeUrl).toBe("/api/geocode?q=Boa%20Viagem");

    const [reportUrl, reportInit] = vi.mocked(global.fetch).mock.calls[1];
    expect(reportUrl).toBe("/api/reports");

    const payload = JSON.parse((reportInit as RequestInit).body as string);
    expect(payload).toMatchObject({ type: "FLOOD", latitude: -8.1258, longitude: -34.9006 });
  });

  it("mantem o endereco anterior quando a edicao do local e cancelada", async () => {
    global.fetch = vi.fn();

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    expect(await screen.findByText("Rua Teste, Recife")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /editar localização/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /novo endereço/i }), {
      target: { value: "Boa Viagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.getByText("Rua Teste, Recife")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("mantem a edicao aberta quando a busca de local falha", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Local nao encontrado" }, 404));

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /editar localização/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /novo endereço/i }), {
      target: { value: "Lugar inexistente" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar endereço/i }));

    expect(await screen.findByText(/local nao encontrado/i)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /novo endereço/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText("Rua Teste, Recife")).toBeInTheDocument();
  });

  it("indica carregamento e bloqueia nova busca enquanto salva o endereco", async () => {
    let resolveSearch: (value: Response) => void = () => {};
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveSearch = resolve;
        }),
    );

    render(<ReportModal open onClose={vi.fn()} />);
    await goToConfirmStep();

    fireEvent.click(screen.getByRole("button", { name: /editar localização/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /novo endereço/i }), {
      target: { value: "Boa Viagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar endereço/i }));

    expect(screen.getByRole("button", { name: /buscando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();

    resolveSearch(
      jsonResponse(
        {
          address: "Boa Viagem, Recife, Pernambuco",
          latitude: -8.1258,
          longitude: -34.9006,
        },
        200,
      ),
    );

    expect(await screen.findByText(/Boa Viagem, Recife/i)).toBeInTheDocument();
  });

  it("desabilita o botao Continuar enquanto nenhum tipo esta selecionado", async () => {
    global.fetch = vi.fn();
    render(<ReportModal open onClose={vi.fn()} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled());

    fireEvent.click(screen.getByText("Alagamento"));
    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
  });
});
