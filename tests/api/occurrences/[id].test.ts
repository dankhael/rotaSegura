// tests/api/occurrences/[id].test.ts

/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO — requerem o banco rodando (npm run db:up).
 * Não mocam nada: validam o SQL raw com PostGIS de verdade.
 *
 * Para rodar isoladamente:
 *   npx vitest run "tests/api/occurrences/[id].test.ts"
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/occurrences/route";
import { GET, PATCH, DELETE } from "@/app/api/occurrences/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedOccurrence(overrides: Record<string, unknown> = {}) {
  const payload = {
    type: "ACCIDENT",
    latitude: -8.1,
    longitude: -34.95,
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/occurrences", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  const res = await POST(req);
  return res.json() as Promise<{ id: string; [k: string]: unknown }>;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$disconnect();
});

// ─── GET /api/occurrences/:id ────────────────────────────────────────────────

describe("GET /api/occurrences/:id", () => {
  it("retorna 200 com a ocorrência correta", async () => {
    const created = await seedOccurrence();

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`);
    const res = await GET(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.type).toBe("ACCIDENT");
    expect(body.latitude).toBe(-8.1);
    expect(body.longitude).toBe(-34.95);
    expect(typeof body.occurredAt).toBe("string");
    expect(typeof body.createdAt).toBe("string");
  });

  it("retorna 404 quando ocorrência não existe", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences/id-inexistente");
    const res = await GET(req, makeCtx("id-inexistente"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/não encontrada/i);
  });

  it("retorna 404 ao buscar ocorrência inexistente após deleção", async () => {
    const created = await seedOccurrence();

    const delReq = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "DELETE",
    });
    await DELETE(delReq, makeCtx(created.id));

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`);
    const res = await GET(req, makeCtx(created.id));
    expect(res.status).toBe(404);
  });

  it("preserva o occurredAt informado pelo cliente", async () => {
    const clientTimestamp = "2024-06-01T08:00:00.000Z";
    const created = await seedOccurrence({ occurredAt: clientTimestamp });

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`);
    const res = await GET(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(new Date(body.occurredAt).toISOString()).toBe(clientTimestamp);
  });
});

// ─── PATCH /api/occurrences/:id ──────────────────────────────────────────────

describe("PATCH /api/occurrences/:id", () => {
  it("atualiza type e retorna 200 com o recurso atualizado", async () => {
    const created = await seedOccurrence({ type: "FLOOD" });

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ type: "FIRE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe("FIRE");
    expect(body.latitude).toBe(-8.1);
  });

  it("atualiza coordenadas e recalcula a coluna geography", async () => {
    const created = await seedOccurrence();

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ latitude: -8.2, longitude: -35.0 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.latitude).toBe(-8.2);
    expect(body.longitude).toBe(-35.0);

    const rows = await prisma.$queryRaw<{ wkt: string }[]>`
      SELECT ST_AsText(location) AS wkt FROM "occurrences" WHERE id = ${created.id}
    `;
    expect(rows[0].wkt).toContain("-35");
    expect(rows[0].wkt).toContain("-8.2");
  });

  it("atualiza occurredAt", async () => {
    const created = await seedOccurrence();
    const newTimestamp = "2025-03-10T12:00:00.000Z";

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ occurredAt: newTimestamp }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(new Date(body.occurredAt).toISOString()).toBe(newTimestamp);
  });

  it("retorna 400 para type inválido no PATCH", async () => {
    const created = await seedOccurrence();

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ type: "TERREMOTO" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando body está vazio ({})", async () => {
    const created = await seedOccurrence();

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/nenhum campo/i);
  });

  it("retorna 404 quando ocorrência não existe", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences/id-inexistente", {
      method: "PATCH",
      body: JSON.stringify({ type: "FIRE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx("id-inexistente"));
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/occurrences/:id ─────────────────────────────────────────────

describe("DELETE /api/occurrences/:id", () => {
  it("remove a ocorrência e retorna 204", async () => {
    const created = await seedOccurrence();

    const req = makeRequest(`http://localhost:3000/api/occurrences/${created.id}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, makeCtx(created.id));
    expect(res.status).toBe(204);

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${created.id}
    `;
    expect(rows).toHaveLength(0);
  });

  it("retorna 404 ao tentar deletar ocorrência inexistente", async () => {
    const req = makeRequest("http://localhost:3000/api/occurrences/id-inexistente", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeCtx("id-inexistente"));
    expect(res.status).toBe(404);
  });

  it("não afeta outras ocorrências ao deletar uma específica", async () => {
    const a = await seedOccurrence({ type: "FLOOD" });
    const b = await seedOccurrence({ type: "FIRE", latitude: -8.2, longitude: -35.0 });

    const req = makeRequest(`http://localhost:3000/api/occurrences/${a.id}`, {
      method: "DELETE",
    });
    await DELETE(req, makeCtx(a.id));

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${b.id}
    `;
    expect(rows).toHaveLength(1);
  });
});
