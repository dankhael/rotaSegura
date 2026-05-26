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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for pode vir como lista; o primeiro é o cliente original.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`login:${ip}`, RATE_LIMIT);
    if (!rate.allowed) {
      return tooManyRequests(
        "Muitas tentativas de login. Tente novamente em instantes.",
        rate.retryAfterSeconds,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!user) {
      // Comparação dummy para nivelar o tempo de resposta e dificultar enumeração por timing.
      await verifyPassword(
        password,
        "$2a$12$CwTycUXWue0Thq9StjUM0uJ8O3p3ZcN8C5KQk6T2RkOdq0fLpmS9G",
      );
      return unauthorized();
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return unauthorized();
    }

    if (user.role !== "ADMIN") {
      return forbidden("Apenas administradores podem acessar o painel");
    }

    const role = user.role as UserRole;
    const token = await signAuthToken({ sub: user.id, email: user.email, role });

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, role },
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return internalError();
  }
}

// Garante runtime Node (bcryptjs/jose com HS256 funcionam em edge, mas Prisma
// e o rate limiter in-memory exigem Node).
export const runtime = "nodejs";
