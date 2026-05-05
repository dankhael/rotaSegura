// src/lib/api-response.ts

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Recurso não encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
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
