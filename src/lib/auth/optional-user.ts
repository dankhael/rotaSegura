import type { NextRequest } from "next/server";

import { AUTH_COOKIE, verifyAuthToken, type AuthTokenPayload } from "@/lib/auth/jwt";

/**
 * Extrai o usuário autenticado a partir do cookie httpOnly de sessão (padrão
 * pós-PR #10) ou, em fallback, do header `Authorization: Bearer <jwt>` — esse
 * último útil pra clients server-to-server e pra testes diretos de rotas.
 *
 * Endpoints públicos com identidade opcional (ex: push subscribe) usam isto
 * para vincular a subscription a `userId` quando o caller é admin.
 *
 * Retorna `null` quando nenhum dos dois está presente OU o token é inválido —
 * o endpoint decide se cai para o fluxo anônimo (deviceId) ou rejeita.
 */
export async function getOptionalUser(request: NextRequest): Promise<AuthTokenPayload | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

function extractToken(request: NextRequest): string | null {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie) return cookie;

  const header = request.headers.get("authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
