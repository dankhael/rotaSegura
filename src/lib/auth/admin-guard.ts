import type { NextRequest } from "next/server";

import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth/jwt";

/**
 * Confere se a requisição traz o cookie httpOnly de um ADMIN válido.
 * Compartilhado entre o middleware (protege as páginas /admin) e os route
 * handlers que servem dados só de admin (ex.: GET /api/occurrences/summary, US10).
 *
 * @example if (!(await isAdminRequest(request))) return unauthorized();
 */
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;

  try {
    const payload = await verifyAuthToken(token);
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}
