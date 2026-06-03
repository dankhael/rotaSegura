import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeedbackAlert } from "@/components/login/feedback-alert";

describe("FeedbackAlert", () => {
  it("anuncia a mensagem como alert para leitores de tela", () => {
    render(<FeedbackAlert type="success" message="Login realizado com sucesso." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Login realizado com sucesso.");
  });

  // Regressão: antes o componente ignorava `type` e sucesso/erro ficavam idênticos.
  it("aplica estilos distintos para sucesso e erro", () => {
    const { rerender } = render(<FeedbackAlert type="success" message="ok" />);
    const successClass = screen.getByRole("alert").className;

    rerender(<FeedbackAlert type="error" message="falhou" />);
    const errorClass = screen.getByRole("alert").className;

    expect(successClass).not.toBe(errorClass);
  });
});
