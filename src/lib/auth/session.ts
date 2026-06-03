import type { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { AUTH_COOKIE } from "@/lib/auth/jwt";

const DEFAULT_MAX_AGE_SECONDS = 3600;

/**
 * Converte `JWT_EXPIRES_IN` (formato aceito por jose: "1h", "30m", "7d", "3600s"
 * ou só número em segundos) em segundos. Fallback para 1h se o formato não bater
 * — mantém o cookie funcional mesmo se a env vier estranha.
 */
export function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.trim().match(/^(\d+)\s*([smhd]?)$/i);
  if (!match) return DEFAULT_MAX_AGE_SECONDS;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}

export function getSessionMaxAgeSeconds(): number {
  return parseExpiryToSeconds(env.JWT_EXPIRES_IN);
}

type CookieResponse = Pick<NextResponse, "cookies">;

/**
 * Grava o JWT em cookie httpOnly. `maxAge` é alinhado com `JWT_EXPIRES_IN` para
 * o cookie sumir junto com a validade do token (em vez de virar cookie de sessão,
 * que sumiria só ao fechar o browser).
 */
export function setSessionCookie(response: CookieResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

/**
 * Apaga o cookie httpOnly. Como o JS no client não consegue mexer em cookies
 * httpOnly, o logout precisa de uma rota servidor (`POST /api/auth/logout`).
 */
export function clearSessionCookie(response: CookieResponse): void {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
