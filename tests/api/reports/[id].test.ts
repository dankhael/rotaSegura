/**
 * @vitest-environment node
 *
 * GET/DELETE /api/reports/:id (US06).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/reports/route";
import { GET, DELETE } from "@/app/api/reports/[id]/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const BASE = { type: "FLOOD", latitude: -8.057838, longitude: -34.88275 };
const devId = () => crypto.randomUUID();

async function postReport(payload: Record<string, unknown>) {
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  const res = await POST(req);
  return res.json() as Promise<{
    report: { id: string };
    occurrence: { id: string; reportCount: number; uniqueDeviceCount: number };
  }>;
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

describe("GET /api/reports/:id", () => {
  it("retorna 200 com o report", async () => {
    const created = await postReport({ ...BASE, deviceId: devId() });
    const res = await GET(
      makeRequest(`http://localhost:3000/api/reports/${created.report.id}`),
      ctx(created.report.id),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toBe(created.report.id);
    expect(body.occurrenceId).toBe(created.occurrence.id);
  });

  it("retorna 404 quando não existe", async () => {
    const res = await GET(
      makeRequest("http://localhost:3000/api/reports/inexistente"),
      ctx("inexistente"),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/reports/:id", () => {
  it("remove report e recomputa agregados; se ficou sem reports, remove occurrence", async () => {
    const a = await postReport({ ...BASE, deviceId: devId() });

    const res = await DELETE(
      makeRequest(`http://localhost:3000/api/reports/${a.report.id}`, { method: "DELETE" }),
      ctx(a.report.id),
    );
    expect(res.status).toBe(204);

    const occRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${a.occurrence.id}
    `;
    expect(occRows).toHaveLength(0);
  });

  it("recomputa contadores quando occurrence sobrevive", async () => {
    const a = await postReport({ ...BASE, deviceId: devId() });
    const b = await postReport({ ...BASE, deviceId: devId() });
    expect(b.occurrence.id).toBe(a.occurrence.id);
    expect(b.occurrence.reportCount).toBe(2);

    await DELETE(
      makeRequest(`http://localhost:3000/api/reports/${b.report.id}`, { method: "DELETE" }),
      ctx(b.report.id),
    );

    const rows = await prisma.$queryRaw<{ reportCount: number; uniqueDeviceCount: number }[]>`
      SELECT "reportCount", "uniqueDeviceCount" FROM "occurrences" WHERE id = ${a.occurrence.id}
    `;
    expect(Number(rows[0].reportCount)).toBe(1);
    expect(Number(rows[0].uniqueDeviceCount)).toBe(1);
  });

  it("retorna 404 quando id não existe", async () => {
    const res = await DELETE(
      makeRequest("http://localhost:3000/api/reports/x", { method: "DELETE" }),
      ctx("x"),
    );
    expect(res.status).toBe(404);
  });
});
