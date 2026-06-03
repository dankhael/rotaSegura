/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const findUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import { SignJWT } from "jose";
import { POST } from "@/app/api/auth/login/route";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth/jwt";
import { resetRateLimit } from "@/lib/auth/rate-limit";

function makeRequest(body: unknown, ip = "127.0.0.1") {
  return new NextRequest(new URL("http://localhost:3000/api/auth/login"), {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  resetRateLimit();
});

describe("POST /api/auth/login", () => {
  it("retorna 200 com token e dados do usuário para credenciais válidas de admin", async () => {
    const passwordHash = await hashPassword("CorrectHorseBattery!1");
    findUniqueMock.mockResolvedValue({
      id: "user_123",
      email: "admin@rotasegura.local",
      passwordHash,
      role: "ADMIN",
    });

    const res = await POST(
      makeRequest({ email: "admin@rotasegura.local", password: "CorrectHorseBattery!1" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);

    // Token entregue só via cookie httpOnly, nunca no corpo legível por JS.
    const cookie = res.cookies.get(AUTH_COOKIE);
    expect(cookie?.value).toEqual(expect.any(String));
    expect(cookie?.httpOnly).toBe(true);
    // maxAge alinhado com JWT_EXPIRES_IN — cookie expira junto com o token.
    expect(cookie?.maxAge).toBeGreaterThan(0);
    expect(cookie?.sameSite).toBe("lax");
    expect(body.token).toBeUndefined();

    expect(body.user).toEqual({
      id: "user_123",
      email: "admin@rotasegura.local",
      role: "ADMIN",
    });
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("o JWT contém id (sub), email, role e expiração", async () => {
    const passwordHash = await hashPassword("CorrectHorseBattery!1");
    findUniqueMock.mockResolvedValue({
      id: "user_123",
      email: "admin@rotasegura.local",
      passwordHash,
      role: "ADMIN",
    });

    const res = await POST(
      makeRequest({ email: "admin@rotasegura.local", password: "CorrectHorseBattery!1" }),
    );
    const token = res.cookies.get(AUTH_COOKIE)?.value;
    expect(token).toEqual(expect.any(String));

    const payload = await verifyAuthToken(token as string);
    expect(payload.sub).toBe("user_123");
    expect(payload.email).toBe("admin@rotasegura.local");
    expect(payload.role).toBe("ADMIN");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("verifyAuthToken rejeita um JWT expirado", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const expired = await new SignJWT({ email: "admin@rotasegura.local", role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await expect(verifyAuthToken(expired)).rejects.toThrow();
  });

  it("normaliza o email (trim + lowercase) antes da busca", async () => {
    const passwordHash = await hashPassword("CorrectHorseBattery!1");
    findUniqueMock.mockResolvedValue({
      id: "user_123",
      email: "admin@rotasegura.local",
      passwordHash,
      role: "ADMIN",
    });

    await POST(
      makeRequest({ email: "  Admin@RotaSegura.Local  ", password: "CorrectHorseBattery!1" }),
    );

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "admin@rotasegura.local" } }),
    );
  });

  it("retorna 401 genérico quando o e-mail não existe", async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ email: "naoexiste@rotasegura.local", password: "qualquer" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Credenciais inválidas");
    expect(body.error).not.toMatch(/email|senha|password/i);
  });

  it("retorna 401 genérico quando a senha está incorreta", async () => {
    const passwordHash = await hashPassword("CorrectHorseBattery!1");
    findUniqueMock.mockResolvedValue({
      id: "user_123",
      email: "admin@rotasegura.local",
      passwordHash,
      role: "ADMIN",
    });

    const res = await POST(makeRequest({ email: "admin@rotasegura.local", password: "errada" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Credenciais inválidas");
  });

  it("retorna 403 quando o usuário existe mas não é ADMIN", async () => {
    const passwordHash = await hashPassword("CorrectHorseBattery!1");
    findUniqueMock.mockResolvedValue({
      id: "user_456",
      email: "user@rotasegura.local",
      passwordHash,
      role: "USER",
    });

    const res = await POST(
      makeRequest({ email: "user@rotasegura.local", password: "CorrectHorseBattery!1" }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Acesso negado");
  });

  it("retorna 400 quando email está ausente", async () => {
    const res = await POST(makeRequest({ password: "qualquer" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Payload inválido");
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });

  it("retorna 400 quando password está ausente", async () => {
    const res = await POST(makeRequest({ email: "admin@rotasegura.local" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })]),
    );
  });

  it("retorna 400 quando email tem formato inválido", async () => {
    const res = await POST(makeRequest({ email: "nao-eh-email", password: "qualquer" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });

  it("retorna 400 quando o body não é JSON válido", async () => {
    const res = await POST(makeRequest("isto-nao-eh-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });

  it("retorna 429 após 5 tentativas no mesmo IP em menos de 1 minuto", async () => {
    findUniqueMock.mockResolvedValue(null);
    const payload = { email: "attacker@example.com", password: "qualquer" };

    const ip = "10.0.0.42";
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest(payload, ip));
      expect(res.status).toBe(401);
    }

    const blocked = await POST(makeRequest(payload, ip));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera novas tentativas após a janela do rate limit expirar", async () => {
    findUniqueMock.mockResolvedValue(null);
    const payload = { email: "attacker@example.com", password: "qualquer" };
    const ip = "10.0.0.99";

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

      for (let i = 0; i < 5; i++) {
        const res = await POST(makeRequest(payload, ip));
        expect(res.status).toBe(401);
      }
      const blocked = await POST(makeRequest(payload, ip));
      expect(blocked.status).toBe(429);

      // janela é 60s — avançar 61s libera o primeiro hit.
      vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
      const released = await POST(makeRequest(payload, ip));
      expect(released.status).toBe(401);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rate limit é por IP — outros IPs não são afetados", async () => {
    findUniqueMock.mockResolvedValue(null);
    const payload = { email: "attacker@example.com", password: "qualquer" };

    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(payload, "10.0.0.1"));
    }
    const blockedFirst = await POST(makeRequest(payload, "10.0.0.1"));
    expect(blockedFirst.status).toBe(429);

    const otherIp = await POST(makeRequest(payload, "10.0.0.2"));
    expect(otherIp.status).toBe(401);
  });
});
