/**
 * @vitest-environment node
 *
 * GET /api/occurrences — lista agregados (US06).
 * Ocorrência agora é derivada de reports; POST/PATCH foram removidos.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/occurrences/route";
import { POST as POST_REPORT } from "@/app/api/reports/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function seedReport(payload: Record<string, unknown>) {
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  const res = await POST_REPORT(req);
  return res.json();
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

describe("GET /api/occurrences", () => {
  it("lista vazia retorna meta zerado", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/occurrences"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta).toMatchObject({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it("lista occurrences com status, contadores e centroid", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FIRE", latitude: -8.1, longitude: -34.95, deviceId: devId() });

    const res = await GET(makeRequest("http://localhost:3000/api/occurrences"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    for (const occ of body.data) {
      expect(occ).toHaveProperty("status");
      expect(occ).toHaveProperty("reportCount");
      expect(occ).toHaveProperty("centroidLatitude");
    }
  });

  it("filtra por status=CONFIRMED", async () => {
    // 3 reports no mesmo cluster → CONFIRMED
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    // 1 report em cluster separado → PENDING
    await seedReport({ type: "FIRE", latitude: -8.2, longitude: -35.0, deviceId: devId() });

    const res = await GET(makeRequest("http://localhost:3000/api/occurrences?status=CONFIRMED"));
    const body = await res.json();
    expect(body.meta.total).toBe(1);
    expect(body.data[0].status).toBe("CONFIRMED");
  });

  it("filtra por type", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FIRE", latitude: -8.2, longitude: -35.0, deviceId: devId() });

    const res = await GET(makeRequest("http://localhost:3000/api/occurrences?type=FIRE"));
    const body = await res.json();
    expect(body.meta.total).toBe(1);
    expect(body.data[0].type).toBe("FIRE");
  });

  it("respeita paginação", async () => {
    for (let i = 0; i < 3; i++) {
      await seedReport({
        type: "FLOOD",
        latitude: -8.05 + i * 0.05,
        longitude: -34.88 + i * 0.05,
        deviceId: devId(),
      });
    }

    const res = await GET(makeRequest("http://localhost:3000/api/occurrences?limit=2"));
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  // RS-TK05: ocorrências além de OCCURRENCE_ACTIVE_WINDOW_MIN saem do mapa
  // público. Os testes usam o default (1440 min) — env.ts parseia process.env
  // no import, então mutar a var aqui não teria efeito; backdatear o registro
  // além da janela é o caminho determinístico.
  it("exclui ocorrências fora da janela de validade (RS-TK05)", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FIRE", latitude: -8.2, longitude: -35.0, deviceId: devId() });

    const expired = new Date(Date.now() - 25 * 60 * 60_000);
    await prisma.$executeRaw`UPDATE "occurrences" SET "lastReportedAt" = ${expired} WHERE type = 'FIRE'`;

    const res = await GET(makeRequest("http://localhost:3000/api/occurrences"));
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe("FLOOD");
    // meta.total também precisa refletir o filtro (COUNT e SELECT em queries separadas)
    expect(body.meta.total).toBe(1);
  });

  it("expiração não apaga a ocorrência do banco (RS-TK05)", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88, deviceId: devId() });
    await seedReport({ type: "FIRE", latitude: -8.2, longitude: -35.0, deviceId: devId() });

    const expired = new Date(Date.now() - 25 * 60 * 60_000);
    await prisma.$executeRaw`UPDATE "occurrences" SET "lastReportedAt" = ${expired} WHERE type = 'FIRE'`;

    // Histórico preservado para auditoria/dashboard admin: some do mapa, não do banco.
    expect(await prisma.occurrence.count()).toBe(2);
  });

  it("retorna 400 para status inválido", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/occurrences?status=INVALID"));
    expect(res.status).toBe(400);
  });

  it("retorna 400 para limit acima do máximo", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/occurrences?limit=101"));
    expect(res.status).toBe(400);
  });
});
