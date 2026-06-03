"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { login, LoginError, type ApiFieldError } from "@/lib/login";

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

type LoginFormProps = {
  /** Path para redirecionar após login bem-sucedido. Default `/admin`. */
  nextUrl?: string;
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

// AC4: bloqueia o envio com campos vazios antes de bater o endpoint — poupa a
// requisição e não consome uma tentativa do rate-limit por IP.
function validateFields(email: string, password: string): FieldErrors {
  return {
    email: email.trim() ? "" : "Informe o email.",
    password: password.trim() ? "" : "Informe a senha.",
  };
}

function hasFieldErrors(errors: FieldErrors): boolean {
  return Boolean(errors.email || errors.password);
}

export function LoginForm({ nextUrl = "/admin" }: LoginFormProps) {
  const router = useRouter();
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

    const fieldErrors = validateFields(email, password);
    if (hasFieldErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }

    setErrors(EMPTY_FIELD_ERRORS);
    setIsSubmitting(true);

    try {
      // Sucesso: o browser grava o cookie httpOnly automaticamente (Set-Cookie).
      await login({ email, password });
      setFeedback({ type: "success", message: "Login realizado com sucesso." });
      router.push(nextUrl);
    } catch (error) {
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
      <TextInput
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
        autoFocus
        error={errors.email}
      />

      <TextInput
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        required
        autoComplete="current-password"
        error={errors.password}
      />

      {feedback.type && <FeedbackAlert type={feedback.type} message={feedback.message} />}

      <SubmitButton loading={isSubmitting} />
    </form>
  );
}
