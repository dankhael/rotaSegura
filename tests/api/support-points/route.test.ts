// tests/api/support-points/route.test.ts

/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO — requerem o banco rodando (npm run db:up).
 * Não mocam nada: validam o SQL raw com PostGIS de verdade.
 *
 * Para rodar isoladamente:
 *   npx vitest run tests/api/support-points/route.test.ts
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/support-points/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function createPointViaApi(overrides: Record<string, unknown> = {}) {
  const payload = {
    name: "Abrigo Central",
    type: "SHELTER",
    latitude: -8.057838,
    longitude: -34.88275,
    capacity: 200,
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/support-points", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return POST(req);
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "support_points"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "support_points"`;
  await prisma.$disconnect();
});

// ─── POST /api/support-points ─────────────────────────────────────────────────

describe("POST /api/support-points", () => {
  it("persiste o ponto no banco e retorna 201", async () => {
    const res = await createPointViaApi();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeTruthy();
    expect(body.name).toBe("Abrigo Central");
    expect(body.type).toBe("SHELTER");
    expect(body.latitude).toBe(-8.057838);
    expect(body.longitude).toBe(-34.88275);
    expect(body.capacity).toBe(200);

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "support_points" WHERE id = ${body.id}
    `;
    expect(rows).toHaveLength(1);
  });

  it("popula a coluna geography(Point) corretamente no PostGIS", async () => {
    const res = await createPointViaApi({ latitude: -8.057838, longitude: -34.88275 });
    const body = await res.json();
    expect(res.status).toBe(201);

    const rows = await prisma.$queryRaw<{ wkt: string }[]>`
      SELECT ST_AsText(location) AS wkt FROM "support_points" WHERE id = ${body.id}
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0].wkt).toMatch(/^POINT\(/);
    expect(rows[0].wkt).toContain("-34.88");
    expect(rows[0].wkt).toContain("-8.05");
  });

  it("cria ponto do tipo MEDICAL sem capacity", async () => {
    const res = await createPointViaApi({ type: "MEDICAL", capacity: undefined });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.type).toBe("MEDICAL");
    expect(body.capacity).toBeNull();
  });

  it("cria ponto do tipo SUPPLY", async () => {
    const res = await createPointViaApi({ type: "SUPPLY", name: "Centro de Distribuição" });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.type).toBe("SUPPLY");
  });

  it("retorna 400 para latitude > 90", async () => {
    const res = await createPointViaApi({ latitude: 91 });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Payload inválido");
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "latitude" })]),
    );
  });

  it("retorna 400 para latitude < -90", async () => {
    const res = await createPointViaApi({ latitude: -91 });
    expect((await res.json()).details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "latitude" })]),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 400 para longitude > 180", async () => {
    const res = await createPointViaApi({ longitude: 181 });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para longitude < -180", async () => {
    const res = await createPointViaApi({ longitude: -181 });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para type inválido com mensagem clara", async () => {
    const res = await createPointViaApi({ type: "HOSPITAL" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "type" })]),
    );
  });

  it("retorna 400 para body malformado (não é JSON)", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points", {
      method: "POST",
      body: "texto solto",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });

  it("retorna 400 quando campos obrigatórios estão ausentes", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points", {
      method: "POST",
      body: JSON.stringify({ name: "Incompleto" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/support-points ──────────────────────────────────────────────────

describe("GET /api/support-points", () => {
  it("retorna lista vazia quando não há registros", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta).toMatchObject({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it("lista pontos criados com meta de paginação correta", async () => {
    await createPointViaApi({ name: "Ponto A" });
    await createPointViaApi({ name: "Ponto B", latitude: -8.06, longitude: -34.89 });
    await createPointViaApi({ name: "Ponto C", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/support-points");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.meta).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
  });

  it("respeita limit e retorna totalPages correto", async () => {
    await createPointViaApi({ name: "Ponto A" });
    await createPointViaApi({ name: "Ponto B", latitude: -8.06, longitude: -34.89 });
    await createPointViaApi({ name: "Ponto C", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/support-points?limit=2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 3, limit: 2, totalPages: 2 });
  });

  it("retorna página 2 com o item restante", async () => {
    await createPointViaApi({ name: "Ponto A" });
    await createPointViaApi({ name: "Ponto B", latitude: -8.06, longitude: -34.89 });
    await createPointViaApi({ name: "Ponto C", latitude: -8.07, longitude: -34.9 });

    const req = makeRequest("http://localhost:3000/api/support-points?page=2&limit=2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toMatchObject({ page: 2, limit: 2 });
  });

  it("retorna 400 para limit inválido", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points?limit=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 para limit acima do máximo (100)", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points?limit=101");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
