import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  badRequest,
  forbidden,
  fromZodError,
  internalError,
  tooManyRequests,
  unauthorized,
} from "@/lib/api-response";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { getClientIp } from "@/lib/http/client-ip";
import { UserRoleSchema, loginSchema, type UserRole } from "@/lib/validations/auth";

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

// anti-timing: nivela o tempo de resposta no caminho de e-mail inexistente.
const DUMMY_PASSWORD_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8O3p3ZcN8C5KQk6T2RkOdq0fLpmS9G";

async function parseBody(request: NextRequest) {
  try {
    return { ok: true as const, data: (await request.json()) as unknown };
  } catch {
    return { ok: false as const };
  }
}

type AuthResult =
  | { ok: true; user: { id: string; email: string; role: UserRole } }
  | { ok: false; status: 401 | 403 };

async function authenticateAdmin(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, role: true },
  });

  if (!user) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { ok: false, status: 401 };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, status: 401 };
  }

  // defensivo: role no banco é string crua e pode driftar.
  const role = UserRoleSchema.safeParse(user.role);
  if (!role.success || role.data !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true, user: { id: user.id, email: user.email, role: role.data } };
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(`login:${getClientIp(request)}`, RATE_LIMIT);
    if (!rate.allowed) {
      return tooManyRequests(
        "Muitas tentativas de login. Tente novamente em instantes.",
        rate.retryAfterSeconds,
      );
    }

    const body = await parseBody(request);
    if (!body.ok) return badRequest("Body deve ser um JSON válido");

    const parsed = loginSchema.safeParse(body.data);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await authenticateAdmin(parsed.data.email, parsed.data.password);
    if (!result.ok) return result.status === 401 ? unauthorized() : forbidden();

    const { id, email, role } = result.user;
    const token = await signAuthToken({ sub: id, email, role });

    // Token só via cookie httpOnly: inacessível ao JS, mitiga roubo por XSS.
    const response = NextResponse.json({ user: { id, email, role } });
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return internalError();
  }
}

// Prisma e o rate limiter in-memory exigem runtime Node.
export const runtime = "nodejs";
