// tests/api/occurrences/route.test.ts

/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO — requerem o banco rodando (npm run db:up).
 * Não mocam nada: validam o SQL raw com PostGIS de verdade.
 *
 * Para rodar isoladamente:
 *   npx vitest run tests/api/occurrences/route.test.ts
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/occurrences/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function createOccurrenceViaApi(overrides: Record<string, unknown> = {}) {
  const payload = {
    type: "FLOOD",
    latitude: -8.057838,
    longitude: -34.88275,
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/occurrences", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return POST(req);
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$disconnect();
});

// ─── POST /api/occurrences ────────────────────────────────────────────────────

describe("POST /api/occurrences", () => {
  it("persiste a ocorrência no banco e retorna 201", async () => {
    const res = await createOccurrenceViaApi();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeTruthy();
    expect(body.type).toBe("FLOOD");
    expect(body.latitude).toBe(-8.057838);
    expect(body.longitude).toBe(-34.88275);
    expect(typeof body.occurredAt).toBe("string");
    expect(typeof body.createdAt).toBe("string");

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${body.id}
    `;
    expect(rows).toHaveLength(1);
  });

  it("popula a coluna geography(Point) corretamente no PostGIS", async () => {
    const res = await createOccurrenceViaApi({ latitude: -8.057838, longitude: -34.88275 });
    const body = await res.json();
    expect(res.status).toBe(201);

    const rows = await prisma.$queryRaw<{ wkt: string }[]>`
      SELECT ST_AsText(location) AS wkt FROM "occurrences" WHERE id = ${body.id}
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0].wkt).toMatch(/^POINT\(/);
    expect(rows[0].wkt).toContain("-34.88");
    expect(rows[0].wkt).toContain("-8.05");
  });

  it("usa timestamp do servidor quando occurredAt não é informado", async () => {
    const before = new Date();
    const res = await createOccurrenceViaApi();
    const after = new Date();
    const body = await res.json();

    expect(res.status).toBe(201);
    const occurredAt = new Date(body.occurredAt);
    expect(occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("usa occurredAt fornecido pelo cliente quando informado", async () => {
    const clientTimestamp = "2025-01-15T10:30:00.000Z";
    const res = await createOccurrenceViaApi({ type: "FIRE", occurredAt: clientTimestamp });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(new Date(body.occurredAt).toISOString()).toBe(clientTimestamp);
  });

  it("aceita todos os tipos válidos", async () => {
    const types = ["FLOOD", "FIRE", "LANDSLIDE", "ACCIDENT", "OBSTRUCTION", "OTHER"] as const;

    for (const type of types) {
      const res = await createOccurrenceViaApi({ type, longitude: -34.88 + Math.random() });
      expect(res.status).toBe(201);
      expect((await res.json()).type).toBe(type);
    }
  });

  it("retorna 400 para type inválido com mensagem clara", async () => {
    const res = await createOccurrenceViaApi({ type: "TERREMOTO" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Payload inválido");
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "type" })]),
    );
  });

  it("retorna 400 para latitude > 90", async () => {
    const res = await createOccurrenceViaApi({ latitude: 91 });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "latitude" })]),
    );
  });

  it("retorna 400 para latitude < -90", async () => {
    const res = await createOccurrenceViaApi({ latitude: -91 });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "latitude" })]),
    );
  });

  it("retorna 400 para longitude > 180", async () => {
    const res = await createOccurrenceViaApi({ longitude: 181 });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "longitude" })]),
    );
  });

  it("retorna 400 para longitude < -180", async () => {
    const res = await createOccurrenceViaApi({ longitude: -181 });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para body malformado (não é JSON)", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences", {
      method: "POST",
      body: "texto solto",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });

  it("retorna 400 quando campos obrigatórios estão ausentes", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences", {
      method: "POST",
      body: JSON.stringify({ type: "FLOOD" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/occurrences ─────────────────────────────────────────────────────

describe("GET /api/occurrences", () => {
  it("retorna lista vazia quando não há registros", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta).toMatchObject({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it("lista ocorrências criadas com meta de paginação correta", async () => {
    await createOccurrenceViaApi({ type: "FLOOD" });
    await createOccurrenceViaApi({ type: "FIRE", latitude: -8.06, longitude: -34.89 });
    await createOccurrenceViaApi({ type: "LANDSLIDE", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/occurrences");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.meta).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
  });

  it("respeita limit e retorna totalPages correto", async () => {
    await createOccurrenceViaApi({ type: "FLOOD" });
    await createOccurrenceViaApi({ type: "FIRE", latitude: -8.06, longitude: -34.89 });
    await createOccurrenceViaApi({ type: "LANDSLIDE", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/occurrences?limit=2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 3, limit: 2, totalPages: 2 });
  });

  it("retorna página 2 com o item restante", async () => {
    await createOccurrenceViaApi({ type: "FLOOD" });
    await createOccurrenceViaApi({ type: "FIRE", latitude: -8.06, longitude: -34.89 });
    await createOccurrenceViaApi({ type: "LANDSLIDE", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/occurrences?page=2&limit=2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toMatchObject({ page: 2, limit: 2 });
  });

  it("retorna 400 para limit inválido", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences?limit=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 para limit acima do máximo (100)", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences?limit=101");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
