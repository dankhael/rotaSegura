import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { pushMock, loginMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/login", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  LoginError: class LoginError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { LoginForm } from "@/components/login/login-form";
import { LoginError } from "@/lib/login";

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: password } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    loginMock.mockReset();
  });

  it("redireciona para /admin após login com sucesso", async () => {
    loginMock.mockResolvedValue({ user: { id: "1", email: "admin@rs.com", role: "ADMIN" } });

    render(<LoginForm />);
    fill("admin@rs.com", "secret");
    submit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin"));
  });

  it("mostra erro e não redireciona quando o login falha", async () => {
    loginMock.mockRejectedValue(new LoginError("Credenciais inválidas", 401));

    render(<LoginForm />);
    fill("admin@rs.com", "errada");
    submit();

    await waitFor(() => expect(screen.getByText("Credenciais inválidas")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  // AC4: campos vazios não disparam requisição (não consome o rate-limit).
  it("não chama a API e exibe erros quando os campos estão vazios", async () => {
    render(<LoginForm />);
    submit();

    expect(await screen.findByText("Informe o email.")).toBeInTheDocument();
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  // AC8: indicador de carregamento durante o submit.
  it("desabilita o botão e mostra 'Entrando...' durante o submit", async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    loginMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<LoginForm />);
    fill("admin@rs.com", "secret");
    submit();

    const button = await screen.findByRole("button", { name: /entrando/i });
    expect(button).toBeDisabled();

    resolveLogin({ user: { id: "1", email: "admin@rs.com", role: "ADMIN" } });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin"));
  });
});
