import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AdminTabs } from "@/components/admin/admin-tabs";

// A aba Dashboard renderiza OccurrenceDashboard, que busca o resumo ao montar.
// Stub para isolar o teste de abas da rede e evitar setState fora de act.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ total: 0, byStatus: { pending: 0, confirmed: 0 }, regions: [] }),
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AdminTabs", () => {
  it("renderiza as duas abas com Dashboard ativo por padrão", async () => {
    render(<AdminTabs />);

    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    // Flush do carregamento do dashboard (busca ao montar) para não vazar act().
    await screen.findByText("Nenhuma ocorrência encontrada");
  });

  it("alterna para Gestão de Locais ao clicar na aba", async () => {
    render(<AdminTabs />);
    await screen.findByText("Nenhuma ocorrência encontrada");

    fireEvent.click(screen.getByRole("tab", { name: "Gestão de Locais" }));

    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/pontos de apoio/i);
  });
});
