/**
 * @vitest-environment node
 *
 * GET /api/occurrences/export — CSV das ocorrências do período (US10 v2).
 * Restrito a ADMIN.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/occurrences/export/route";
import { POST as POST_REPORT } from "@/app/api/reports/route";
import { AUTH_COOKIE, signAuthToken } from "@/lib/auth/jwt";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function exportRequest(query = "", role?: "ADMIN" | "USER") {
  const request = makeRequest(`http://localhost:3000/api/occurrences/export${query}`);
  if (role) {
    const token = await signAuthToken({ sub: "1", email: `${role}@rs.com`, role });
    request.cookies.set(AUTH_COOKIE, token);
  }
  return request;
}

async function seedReport(payload: Record<string, unknown>) {
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  await POST_REPORT(req);
}

const devId = () => crypto.randomUUID();

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$disconnect();
});

describe("GET /api/occurrences/export", () => {
  it("retorna 401 sem cookie de admin", async () => {
    const res = await GET(await exportRequest());
    expect(res.status).toBe(401);
  });

  it("retorna CSV com cabeçalho e uma linha por ocorrência", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });

    const res = await GET(await exportRequest("", "ADMIN"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");

    const lines = (await res.text()).trim().split("\n");
    expect(lines[0]).toBe(
      "id,tipo,status,gravidade,bairro,relatos,primeiro_relato,ultimo_relato,confirmada_em",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Alagamento");
    expect(lines[1]).toContain("Afogados");
  });

  it("retorna 400 para período inválido", async () => {
    const res = await GET(await exportRequest("?period=ano", "ADMIN"));
    expect(res.status).toBe(400);
  });
});
