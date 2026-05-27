/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO do endpoint /api/reports.
 * Requerem o banco rodando (npm run db:up).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/reports/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function postReport(payload: Record<string, unknown>) {
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req);
}

const BASE = { type: "FLOOD", latitude: -8.057838, longitude: -34.88275 };

function devId() {
  return crypto.randomUUID();
}

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$disconnect();
});

describe("POST /api/reports", () => {
  it("cria report + nova occurrence PENDING e retorna 201", async () => {
    const res = await postReport({ ...BASE, deviceId: devId() });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.report.id).toBeTruthy();
    expect(body.report.type).toBe("FLOOD");
    expect(body.report.occurrenceId).toBe(body.occurrence.id);
    expect(body.occurrence.status).toBe("PENDING");
    expect(body.occurrence.reportCount).toBe(1);
    expect(body.clustering).toEqual({
      created: true,
      promoted: false,
      duplicateDevice: false,
    });
  });

  it("popula PostGIS geography do report", async () => {
    const res = await postReport({ ...BASE, deviceId: devId() });
    const body = await res.json();

    const rows = await prisma.$queryRaw<{ wkt: string }[]>`
      SELECT ST_AsText(location) AS wkt FROM "reports" WHERE id = ${body.report.id}
    `;
    expect(rows[0].wkt).toMatch(/^POINT\(/);
    expect(rows[0].wkt).toContain("-34.88");
    expect(rows[0].wkt).toContain("-8.05");
  });

  it("3 POSTs distintos elevam para CONFIRMED (clustering.promoted no 3º)", async () => {
    const r1resp = await postReport({ ...BASE, deviceId: devId() });
    const r2resp = await postReport({ ...BASE, deviceId: devId() });
    const r3resp = await postReport({ ...BASE, deviceId: devId() });
    const r1 = await r1resp.json();
    const r2 = await r2resp.json();
    const r3 = await r3resp.json();

    expect(r1.occurrence.status).toBe("PENDING");
    expect(r2.occurrence.status).toBe("PENDING");
    expect(r3resp.status).toBe(201);
    expect(r3.occurrence.status).toBe("CONFIRMED");
    expect(r3.clustering.promoted).toBe(true);
  });

  it("retorna 200 + duplicateDevice=true para deviceId repetido na mesma occurrence", async () => {
    const dev = devId();
    const first = await (await postReport({ ...BASE, deviceId: dev })).json();
    const dupResp = await postReport({ ...BASE, deviceId: dev });
    const dup = await dupResp.json();

    expect(dupResp.status).toBe(200);
    expect(dup.clustering.duplicateDevice).toBe(true);
    expect(dup.report.id).toBe(first.report.id);
  });

  it("aceita POST sem deviceId; conta em reportCount, não em uniqueDeviceCount", async () => {
    await postReport({ ...BASE });
    const r2 = await (await postReport({ ...BASE })).json();

    expect(r2.occurrence.reportCount).toBe(2);
    expect(r2.occurrence.uniqueDeviceCount).toBe(0);
  });

  it("retorna 400 para deviceId que não é UUID", async () => {
    const res = await postReport({ ...BASE, deviceId: "not-a-uuid" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "deviceId" })]),
    );
  });

  it("retorna 400 para type inválido", async () => {
    const res = await postReport({ ...BASE, type: "TERREMOTO", deviceId: devId() });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para latitude fora de [-90,90]", async () => {
    const res = await postReport({ ...BASE, latitude: 91, deviceId: devId() });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para occurredAt no futuro (evita inflar a janela)", async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const res = await postReport({ ...BASE, occurredAt: future, deviceId: devId() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "occurredAt" })]),
    );
  });

  it("retorna 400 para body inválido (não-JSON)", async () => {
    const req = makeRequest("http://localhost:3000/api/reports", {
      method: "POST",
      body: "texto solto",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/reports", () => {
  it("lista vazia retorna meta zerado", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/reports"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta).toMatchObject({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it("lista paginada por occurredAt DESC", async () => {
    await postReport({ ...BASE, deviceId: devId() });
    await postReport({ ...BASE, deviceId: devId() });
    await postReport({ ...BASE, deviceId: devId() });

    const res = await GET(makeRequest("http://localhost:3000/api/reports?limit=2"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });

  it("filtra por occurrenceId", async () => {
    const a = await (await postReport({ ...BASE, deviceId: devId() })).json();
    await postReport({
      ...BASE,
      latitude: BASE.latitude + 0.01,
      longitude: BASE.longitude + 0.01,
      deviceId: devId(),
    }); // cluster diferente (fora do raio)

    const res = await GET(
      makeRequest(`http://localhost:3000/api/reports?occurrenceId=${a.occurrence.id}`),
    );
    const body = await res.json();
    expect(body.meta.total).toBe(1);
    expect(body.data[0].occurrenceId).toBe(a.occurrence.id);
  });

  it("filtra por type", async () => {
    await postReport({ ...BASE, type: "FLOOD", deviceId: devId() });
    await postReport({ ...BASE, type: "FIRE", deviceId: devId() });

    const res = await GET(makeRequest("http://localhost:3000/api/reports?type=FIRE"));
    const body = await res.json();
    expect(body.meta.total).toBe(1);
    expect(body.data[0].type).toBe("FIRE");
  });

  it("retorna 400 para limit acima de 100", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/reports?limit=200"));
    expect(res.status).toBe(400);
  });
});
