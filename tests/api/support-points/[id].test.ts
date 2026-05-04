// tests/api/support-points/[id].test.ts

/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO — requerem o banco rodando (npm run db:up).
 * Não mocam nada: validam o SQL raw com PostGIS de verdade.
 *
 * Para rodar isoladamente:
 *   npx vitest run "tests/api/support-points/[id].test.ts"
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/support-points/route";
import { GET, PATCH, DELETE } from "@/app/api/support-points/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedPoint(overrides: Record<string, unknown> = {}) {
  const payload = {
    name: "Posto Médico Norte",
    type: "MEDICAL",
    latitude: -8.1,
    longitude: -34.95,
    capacity: 50,
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/support-points", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  const res = await POST(req);
  return res.json() as Promise<{ id: string; [k: string]: unknown }>;
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "support_points"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "support_points"`;
  await prisma.$disconnect();
});

// ─── GET /api/support-points/:id ─────────────────────────────────────────────

describe("GET /api/support-points/:id", () => {
  it("retorna 200 com o ponto correto", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`);
    const res = await GET(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.name).toBe("Posto Médico Norte");
    expect(body.type).toBe("MEDICAL");
    expect(typeof body.createdAt).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
  });

  it("retorna 404 quando ponto não existe", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points/id-inexistente");
    const res = await GET(req, makeCtx("id-inexistente"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/não encontrado/i);
  });
});

// ─── PATCH /api/support-points/:id ───────────────────────────────────────────

describe("PATCH /api/support-points/:id", () => {
  it("atualiza nome e retorna 200 com o recurso atualizado", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Posto Médico Norte — Atualizado" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("Posto Médico Norte — Atualizado");
    expect(body.type).toBe("MEDICAL");
    expect(body.capacity).toBe(50);
  });

  it("atualiza coordenadas e recalcula a coluna geography", async () => {
    const created = await seedPoint();

    const novaLat = -8.2;
    const novaLng = -35.0;

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ latitude: novaLat, longitude: novaLng }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.latitude).toBe(novaLat);
    expect(body.longitude).toBe(novaLng);

    const rows = await prisma.$queryRaw<{ wkt: string }[]>`
      SELECT ST_AsText(location) AS wkt FROM "support_points" WHERE id = ${created.id}
    `;
    expect(rows[0].wkt).toContain("-35");
    expect(rows[0].wkt).toContain("-8.2");
  });

  it("atualiza capacity para null (remoção do valor)", async () => {
    const created = await seedPoint({ capacity: 100 });

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ capacity: null }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(200);
  });

  it("retorna 404 quando ponto não existe", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points/id-inexistente", {
      method: "PATCH",
      body: JSON.stringify({ name: "Novo nome" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx("id-inexistente"));
    expect(res.status).toBe(404);
  });

  it("retorna 400 para latitude inválida no PATCH", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ latitude: 999 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando body está vazio ({})", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/nenhum campo/i);
  });

  it("retorna 400 para body malformado", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "PATCH",
      body: "não é json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/support-points/:id ──────────────────────────────────────────

describe("DELETE /api/support-points/:id", () => {
  it("remove o ponto e retorna 204", async () => {
    const created = await seedPoint();

    const req = makeRequest(`http://localhost:3000/api/support-points/${created.id}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, makeCtx(created.id));
    expect(res.status).toBe(204);

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "support_points" WHERE id = ${created.id}
    `;
    expect(rows).toHaveLength(0);
  });

  it("retorna 404 ao tentar deletar ponto inexistente", async () => {
    const req = makeRequest("http://localhost:3000/api/support-points/id-inexistente", {
      method: "DELETE",
    });

    const res = await DELETE(req, makeCtx("id-inexistente"));
    expect(res.status).toBe(404);
  });

  it("não afeta outros pontos ao deletar um específico", async () => {
    const a = await seedPoint({ name: "Ponto A" });
    const b = await seedPoint({ name: "Ponto B", latitude: -8.2, longitude: -35.0 });

    const req = makeRequest(`http://localhost:3000/api/support-points/${a.id}`, {
      method: "DELETE",
    });
    await DELETE(req, makeCtx(a.id));

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "support_points" WHERE id = ${b.id}
    `;
    expect(rows).toHaveLength(1);
  });
});
