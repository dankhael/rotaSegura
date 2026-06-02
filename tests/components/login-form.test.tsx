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

function fillAndSubmit(email = "admin@rs.com", password = "secret") {
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Senha"), { target: { value: password } });
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
    fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin"));
  });

  it("mostra erro e não redireciona quando o login falha", async () => {
    loginMock.mockRejectedValue(new LoginError("Credenciais inválidas", 401));

    render(<LoginForm />);
    fillAndSubmit("admin@rs.com", "errada");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Credenciais inválidas"),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
