import type { NextRequest } from "next/server";

import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth/jwt";

/**
 * Extrai o usuário autenticado se houver `Authorization: Bearer <jwt>` válido.
 * Endpoints públicos com identidade opcional (ex: push subscribe) usam isto
 * para vincular a subscription a `userId` quando o caller é admin.
 *
 * Retorna `null` quando o header está ausente OU o token é inválido — o
 * endpoint decide se cai para o fluxo anônimo (deviceId) ou rejeita.
 */
export async function getOptionalUser(request: NextRequest): Promise<AuthTokenPayload | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    return await verifyAuthToken(match[1]);
  } catch {
    return null;
  }
}
