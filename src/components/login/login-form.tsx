"use client";

import { useState } from "react";

import { login, LoginError } from "../../lib/login";

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

export function LoginForm() {
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({
    email: "",
    password: "",
  });

  const [feedback, setFeedback] = useState<FeedbackState>({
    type: null,
    message: "",
  });

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault();

    /*
     * reset states
     */
    setFeedback({
      type: null,
      message: "",
    });

    setErrors({
      email: "",
      password: "",
    });

    try {
      setIsSubmitting(true);

      const data = await login({
        email,
        password,
      });

      /*
       * persist token
       */
      localStorage.setItem("token", data.token);

      setFeedback({
        type: "success",
        message: "Login realizado com sucesso.",
      });

      /*
       * redirect futuramente
       */
      // router.push("/admin");
    } catch (error: unknown) {
      if (error instanceof LoginError) {
        /*
         * zod validation errors
         */
        if (error.status === 400 && error.details) {
          const nextErrors: FieldErrors = {
            email: "",
            password: "",
          };

          for (const detail of error.details) {
            if (detail.field === "email") {
              nextErrors.email = detail.message;
            }

            if (detail.field === "password") {
              nextErrors.password = detail.message;
            }
          }

          setErrors(nextErrors);
        }

        /*
         * rate limit custom message
         */
        let message = error.message;

        if (error.status === 429 && error.retryAfterSeconds) {
          message = `Tente novamente em ${error.retryAfterSeconds}s`;
        }

        setFeedback({
          type: "error",
          message,
        });

        return;
      }

      /*
       * unexpected error
       */
      setFeedback({
        type: "error",
        message: "Erro inesperado.",
      });
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
