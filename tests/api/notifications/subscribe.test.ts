/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const executeRawMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
  },
}));

import { DELETE, POST } from "@/app/api/notifications/subscribe/route";
import { signAuthToken } from "@/lib/auth/jwt";
import { resetRateLimit } from "@/lib/auth/rate-limit";

function makeRequest(
  method: "POST" | "DELETE",
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return new NextRequest(new URL("http://localhost:3000/api/notifications/subscribe"), {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

const VALID_SUB = {
  endpoint: "https://push.example/abc",
  keys: { p256dh: "pkey", auth: "akey" },
};
const VALID_DEVICE_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  executeRawMock.mockReset();
  executeRawMock.mockResolvedValue(1);
  resetRateLimit();
});

describe("POST /api/notifications/subscribe", () => {
  it("salva subscription com deviceId anônimo (AC-02)", async () => {
    const res = await POST(
      makeRequest("POST", {
        subscription: VALID_SUB,
        deviceId: VALID_DEVICE_ID,
        latitude: -19.92,
        longitude: -43.93,
      }),
    );
    expect(res.status).toBe(201);
    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("aceita admin autenticado mesmo sem deviceId", async () => {
    const token = await signAuthToken({ sub: "admin-1", email: "a@x", role: "ADMIN" });
    const res = await POST(
      makeRequest(
        "POST",
        {
          subscription: VALID_SUB,
          latitude: -19.92,
          longitude: -43.93,
        },
        { Authorization: `Bearer ${token}` },
      ),
    );
    expect(res.status).toBe(201);
  });

  it("rejeita quando não há nem deviceId nem usuário autenticado", async () => {
    const res = await POST(
      makeRequest("POST", {
        subscription: VALID_SUB,
        latitude: -19.92,
        longitude: -43.93,
      }),
    );
    expect(res.status).toBe(400);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("rejeita payload inválido (subscription mal-formada)", async () => {
    const res = await POST(
      makeRequest("POST", {
        subscription: { endpoint: "not-a-url", keys: { p256dh: "", auth: "" } },
        deviceId: VALID_DEVICE_ID,
        latitude: 0,
        longitude: 0,
      }),
    );
    expect(res.status).toBe(400);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("rejeita body JSON inválido", async () => {
    const res = await POST(makeRequest("POST", "not-json"));
    expect(res.status).toBe(400);
  });

  it("bloqueia rajada de inscrições com 429 (anti-flood)", async () => {
    const body = {
      subscription: VALID_SUB,
      deviceId: VALID_DEVICE_ID,
      latitude: -19.92,
      longitude: -43.93,
    };
    // RATE_LIMIT.max = 30 — o 31º request no mesmo IP estoura.
    for (let i = 0; i < 30; i++) {
      const ok = await POST(makeRequest("POST", body));
      expect(ok.status).toBe(201);
    }
    const blocked = await POST(makeRequest("POST", body));
    expect(blocked.status).toBe(429);
  });
});

describe("DELETE /api/notifications/subscribe", () => {
  it("remove subscription com deviceId (AC-07)", async () => {
    executeRawMock.mockResolvedValueOnce(1);
    const res = await DELETE(
      makeRequest("DELETE", { endpoint: VALID_SUB.endpoint, deviceId: VALID_DEVICE_ID }),
    );
    expect(res.status).toBe(200);
  });

  it("remove subscription com usuário admin autenticado", async () => {
    executeRawMock.mockResolvedValueOnce(1);
    const token = await signAuthToken({ sub: "admin-1", email: "a@x", role: "ADMIN" });
    const res = await DELETE(
      makeRequest("DELETE", { endpoint: VALID_SUB.endpoint }, { Authorization: `Bearer ${token}` }),
    );
    expect(res.status).toBe(200);
  });

  it("rejeita DELETE sem deviceId nem token (vetor de derrubada alheia)", async () => {
    const res = await DELETE(makeRequest("DELETE", { endpoint: VALID_SUB.endpoint }));
    expect(res.status).toBe(401);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("retorna 404 quando endpoint+identidade não casam (não derruba alheia)", async () => {
    executeRawMock.mockResolvedValueOnce(0);
    const res = await DELETE(
      makeRequest("DELETE", { endpoint: VALID_SUB.endpoint, deviceId: VALID_DEVICE_ID }),
    );
    expect(res.status).toBe(404);
  });

  it("rejeita endpoint mal-formado", async () => {
    const res = await DELETE(makeRequest("DELETE", { endpoint: "abc", deviceId: VALID_DEVICE_ID }));
    expect(res.status).toBe(400);
    expect(executeRawMock).not.toHaveBeenCalled();
  });
});
