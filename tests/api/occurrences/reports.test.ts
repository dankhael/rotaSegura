/**
 * @vitest-environment node
 *
 * GET /api/occurrences/:id/reports — rastreabilidade (AC8, US06).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { POST as POST_REPORT } from "@/app/api/reports/route";
import { GET } from "@/app/api/occurrences/[id]/reports/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const BASE = { type: "FLOOD", latitude: -8.057838, longitude: -34.88275 };
const devId = () => crypto.randomUUID();

async function seedReport(overrides: Record<string, unknown> = {}) {
  const payload = { ...BASE, deviceId: devId(), ...overrides };
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  const res = await POST_REPORT(req);
  return res.json();
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

describe("GET /api/occurrences/:id/reports", () => {
  it("retorna 404 quando ocorrência não existe", async () => {
    const res = await GET(makeRequest("http://localhost:3000/api/occurrences/x/reports"), ctx("x"));
    expect(res.status).toBe(404);
  });

  it("lista todos os reports da ocorrência (consolidados)", async () => {
    const a = await seedReport();
    await seedReport({}); // mesmo cluster
    await seedReport({}); // mesmo cluster

    const res = await GET(
      makeRequest(`http://localhost:3000/api/occurrences/${a.occurrence.id}/reports`),
      ctx(a.occurrence.id),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.meta.total).toBe(3);
    expect(body.data).toHaveLength(3);
    for (const r of body.data) {
      expect(r.occurrenceId).toBe(a.occurrence.id);
    }
  });

  it("paginação respeitada", async () => {
    const a = await seedReport();
    await seedReport({});
    await seedReport({});

    const res = await GET(
      makeRequest(`http://localhost:3000/api/occurrences/${a.occurrence.id}/reports?limit=2`),
      ctx(a.occurrence.id),
    );
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 3, totalPages: 2 });
  });
});
