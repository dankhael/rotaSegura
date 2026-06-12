import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { LoginHeader } from "@/components/login/login-header";

describe("LoginHeader", () => {
  // RS-TK05: a tela de login precisa deixar claro que é acesso administrativo.
  it("exibe título 'Acesso administrativo' como h1 da página", () => {
    render(<LoginHeader />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
    ).toBeInTheDocument();
  });

  it("exibe subtítulo mencionando o painel do administrador", () => {
    render(<LoginHeader />);

    expect(
      screen.getByText("Entre com suas credenciais para acessar o painel do administrador"),
    ).toBeInTheDocument();
  });

  it("mantém o link de voltar para a home", () => {
    render(<LoginHeader />);

    expect(screen.getByRole("link", { name: /voltar/i })).toHaveAttribute("href", "/");
  });
});
