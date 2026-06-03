import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TextInput } from "@/components/login/text-input";

describe("TextInput", () => {
  it("associa o <label> ao input (acessível por label)", () => {
    render(<TextInput label="Email" value="" onChange={() => {}} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("sinaliza erro com aria-invalid e liga a mensagem via aria-describedby", () => {
    render(
      <TextInput
        label="Senha"
        type="password"
        value=""
        onChange={() => {}}
        error="Informe a senha."
      />,
    );

    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Informe a senha.");
  });
});
