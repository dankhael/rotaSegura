// src/lib/api-response.ts

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Credenciais inválidas") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Acesso negado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Recurso não encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function tooManyRequests(
  message = "Tente novamente em instantes",
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    { error: message, retryAfterSeconds },
    {
      status: 429,
      headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
    },
  );
}

export function internalError(message = "Erro interno do servidor") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function fromZodError(err: ZodError) {
  return badRequest(
    "Payload inválido",
    err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  );
}
