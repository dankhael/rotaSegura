import type { UserRole } from "@/lib/validations/auth";

type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export class LoginError extends Error {
  status: number;
  details?: ApiFieldError[];
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    details?: ApiFieldError[],
    retryAfterSeconds?: number,
  ) {
    super(message);

    this.name = "LoginError";

    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new LoginError("Erro de conexão com o servidor", 0);
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new LoginError("Resposta inválida do servidor", response.status);
  }

  if (!response.ok) {
    const errorData = data as {
      error?: string;
      details?: ApiFieldError[];
      retryAfterSeconds?: number;
    };

    throw new LoginError(
      errorData.error || "Erro ao realizar login",
      response.status,
      errorData.details,
      errorData.retryAfterSeconds,
    );
  }

  return data as LoginResponse;
}
