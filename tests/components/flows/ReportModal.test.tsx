import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportModal } from "../../../src/components/home/report-modal/modal-report";

// 🔥 MOCK DO HOOK DE GEOLOCALIZAÇÃO
vi.mock("@/lib/hooks/use-geolocation", () => {
  return {
    useGeolocation: () => ({
      coords: {
        lat: -8.05,
        lng: -34.9,
      },
    }),
  };
});

// (opcional mas recomendado)
vi.mock("@/lib/geocoding/getAddressFromCoords", () => {
  return {
    getAddressFromCoords: async () => "Rua Teste, Recife",
  };
});

describe("ReportModal", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("fluxo completo: envia ocorrência com sucesso", async () => {
    render(<ReportModal open={true} onClose={vi.fn()} />);

    // 1. selecionar ocorrência
    fireEvent.click(screen.getByText("Alagamento"));

    // 2. continuar
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    // 3. esperar modal de confirmação aparecer
    expect(await screen.findByText(/confirmar envio/i)).toBeTruthy();

    // 4. clicar confirmar
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    // 5. validar fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/occurrences",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.any(String),
        }),
      );
    });
  });
});
