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

beforeEach(() => {
  executeRawMock.mockReset();
  executeRawMock.mockResolvedValue(1);
});

describe("POST /api/notifications/subscribe", () => {
  it("salva subscription com deviceId anônimo (AC-02)", async () => {
    const res = await POST(
      makeRequest("POST", {
        subscription: VALID_SUB,
        deviceId: "11111111-1111-1111-1111-111111111111",
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
        deviceId: "11111111-1111-1111-1111-111111111111",
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
});

describe("DELETE /api/notifications/subscribe", () => {
  it("remove subscription pelo endpoint (AC-07)", async () => {
    executeRawMock.mockResolvedValueOnce(1);
    const res = await DELETE(makeRequest("DELETE", { endpoint: VALID_SUB.endpoint }));
    expect(res.status).toBe(200);
  });

  it("retorna 404 quando o endpoint não existe", async () => {
    executeRawMock.mockResolvedValueOnce(0);
    const res = await DELETE(makeRequest("DELETE", { endpoint: VALID_SUB.endpoint }));
    expect(res.status).toBe(404);
  });

  it("rejeita endpoint mal-formado", async () => {
    const res = await DELETE(makeRequest("DELETE", { endpoint: "abc" }));
    expect(res.status).toBe(400);
    expect(executeRawMock).not.toHaveBeenCalled();
  });
});
