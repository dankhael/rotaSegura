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
import { GET } from "@/app/api/occurrences/[id]/route";

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

// ─── GET /api/occurrences/:id ─────────────────────────────────────────────────

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
