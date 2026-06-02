"use client";

import { useState } from "react";

import { login, LoginError, type ApiFieldError } from "../../lib/login";

import { TextInput } from "./text-input";
import { SubmitButton } from "./submit-button";
import { FeedbackAlert } from "./feedback-alert";

type FieldErrors = {
  email: string;
  password: string;
};

type FeedbackState = {
  type: "success" | "error" | null;
  message: string;
};

const EMPTY_FIELD_ERRORS: FieldErrors = { email: "", password: "" };

// Converte os erros de validação (400) do backend nos campos do formulário.
function mapFieldErrors(details: ApiFieldError[]): FieldErrors {
  const next = { ...EMPTY_FIELD_ERRORS };
  for (const detail of details) {
    if (detail.field === "email") next.email = detail.message;
    if (detail.field === "password") next.password = detail.message;
  }
  return next;
}

// 429 vem com retryAfterSeconds; os demais erros usam a mensagem da própria API.
function toErrorMessage(error: LoginError): string {
  if (error.status === 429 && error.retryAfterSeconds) {
    return `Tente novamente em ${error.retryAfterSeconds}s`;
  }
  return error.message;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_FIELD_ERRORS);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: "" });

  function showError(error: unknown) {
    if (!(error instanceof LoginError)) {
      setFeedback({ type: "error", message: "Erro inesperado." });
      return;
    }
    if (error.status === 400 && error.details) setErrors(mapFieldErrors(error.details));
    setFeedback({ type: "error", message: toErrorMessage(error) });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback({ type: null, message: "" });
    setErrors(EMPTY_FIELD_ERRORS);
    setIsSubmitting(true);

    try {
      // Sucesso: o browser grava o cookie httpOnly automaticamente (Set-Cookie).
      await login({ email, password });
      setFeedback({ type: "success", message: "Login realizado com sucesso." });
      // TODO: redirecionar para o painel quando a rota /admin existir.
    } catch (error) {
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <TextInput
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="Email"
        error={errors.email}
      />

      <TextInput
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Senha"
        error={errors.password}
      />

      {feedback.type && <FeedbackAlert type={feedback.type} message={feedback.message} />}

      <SubmitButton loading={isSubmitting} />
    </form>
  );
}
