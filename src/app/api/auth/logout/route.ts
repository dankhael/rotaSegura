import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";

/**
 * Encerra a sessão administrativa: apaga o cookie httpOnly que carrega o JWT.
 * O JS do client não consegue limpar cookies httpOnly por conta própria — por
 * isso o logout precisa de uma rota servidor.
 *
 * Sempre 204 (idempotente) — chamar sem cookie é no-op intencional.
 */
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}

// `clearSessionCookie` lê env vars; mantém em Node por consistência com /login.
export const runtime = "nodejs";
