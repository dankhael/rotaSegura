/**
 * @vitest-environment node
 *
 * GET/DELETE /api/occurrences/:id (US06).
 * PATCH foi removido: ocorrência é estado derivado de reports.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { POST as POST_REPORT } from "@/app/api/reports/route";
import { GET, DELETE } from "@/app/api/occurrences/[id]/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const devId = () => crypto.randomUUID();

async function seedReport(overrides: Record<string, unknown> = {}) {
  const payload = {
    type: "ACCIDENT",
    latitude: -8.1,
    longitude: -34.95,
    deviceId: devId(),
    ...overrides,
  };
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

describe("GET /api/occurrences/:id", () => {
  it("retorna 200 com a ocorrência agregada", async () => {
    const created = await seedReport({ type: "FLOOD" });
    const res = await GET(
      makeRequest(`http://localhost:3000/api/occurrences/${created.occurrence.id}`),
      ctx(created.occurrence.id),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toBe(created.occurrence.id);
    expect(body.status).toBe("PENDING");
    expect(body.type).toBe("FLOOD");
    expect(body.reportCount).toBe(1);
  });

  it("retorna 404 quando id não existe", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/occurrences/inexistente"),
      ctx("inexistente"),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/occurrences/:id", () => {
  it("remove ocorrência e cascateia reports", async () => {
    const created = await seedReport();

    const res = await DELETE(
      makeRequest(`http://localhost:3000/api/occurrences/${created.occurrence.id}`, {
        method: "DELETE",
      }),
      ctx(created.occurrence.id),
    );
    expect(res.status).toBe(204);

    const reportRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "reports" WHERE id = ${created.report.id}
    `;
    expect(reportRows).toHaveLength(0);
  });

  it("retorna 404 ao deletar id inexistente", async () => {
    const res = await DELETE(
      makeRequest("http://localhost:3000/api/occurrences/x", { method: "DELETE" }),
      ctx("x"),
    );
    expect(res.status).toBe(404);
  });

  it("não afeta outras ocorrências", async () => {
    const a = await seedReport({ type: "FLOOD", latitude: -8.05, longitude: -34.88 });
    const b = await seedReport({ type: "FIRE", latitude: -8.2, longitude: -35.0 });

    await DELETE(
      makeRequest(`http://localhost:3000/api/occurrences/${a.occurrence.id}`, {
        method: "DELETE",
      }),
      ctx(a.occurrence.id),
    );

    const remaining = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${b.occurrence.id}
    `;
    expect(remaining).toHaveLength(1);
  });
});
