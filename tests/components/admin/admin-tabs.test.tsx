import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AdminTabs } from "@/components/admin/admin-tabs";

describe("AdminTabs", () => {
  it("renderiza as duas abas com Dashboard ativo por padrão", () => {
    render(<AdminTabs />);

    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("alterna para Gestão de Locais ao clicar na aba", () => {
    render(<AdminTabs />);

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
