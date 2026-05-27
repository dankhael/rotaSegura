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
import { loginSchema, type UserRole } from "@/lib/validations/auth";

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

// Hash bcrypt fixo usado para nivelar o tempo de resposta quando o e-mail não
// existe. Sem isso, dá pra enumerar usuários medindo a diferença entre "miss"
// (sem bcrypt.compare) e "senha errada" (com bcrypt.compare).
const DUMMY_PASSWORD_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8O3p3ZcN8C5KQk6T2RkOdq0fLpmS9G";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

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

  if (user.role !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true, user: { id: user.id, email: user.email, role: user.role as UserRole } };
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
    return NextResponse.json({ token, user: { id, email, role } });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return internalError();
  }
}

// Garante runtime Node (bcryptjs/jose com HS256 funcionam em edge, mas Prisma
// e o rate limiter in-memory exigem Node).
export const runtime = "nodejs";
