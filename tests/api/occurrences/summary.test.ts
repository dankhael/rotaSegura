/**
 * @vitest-environment node
 *
 * GET /api/occurrences/summary — resumo rico do dashboard admin (US10 v2).
 * Restrito a ADMIN; agrega status, tipo, gravidade, bairro, série e tendência.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/occurrences/summary/route";
import { POST as POST_REPORT } from "@/app/api/reports/route";
import { AUTH_COOKIE, signAuthToken } from "@/lib/auth/jwt";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function summaryRequest(query = "", role?: "ADMIN" | "USER") {
  const request = makeRequest(`http://localhost:3000/api/occurrences/summary${query}`);
  if (role) {
    const token = await signAuthToken({ sub: "1", email: `${role}@rs.com`, role });
    request.cookies.set(AUTH_COOKIE, token);
  }
  return request;
}

async function seedReport(payload: Record<string, unknown>) {
  const req = makeRequest("http://localhost:3000/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  await POST_REPORT(req);
}

const devId = () => crypto.randomUUID();
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$disconnect();
});

describe("GET /api/occurrences/summary", () => {
  it("retorna 401 sem cookie de admin", async () => {
    const res = await GET(await summaryRequest());
    expect(res.status).toBe(401);
  });

  it("retorna 401 para token de role USER", async () => {
    const res = await GET(await summaryRequest("", "USER"));
    expect(res.status).toBe(401);
  });

  it("retorna resumo zerado com período padrão 7d", async () => {
    const res = await GET(await summaryRequest("", "ADMIN"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.byStatus).toEqual({ pending: 0, confirmed: 0 });
    expect(body.byType).toEqual([]);
    expect(body.period).toBe("7d");
  });

  it("agrega total, status, tipo, regiões (bairro) e recentes", async () => {
    // 3 relatos no mesmo ponto → ocorrência CONFIRMED (Afogados).
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });
    // 1 relato distante → PENDING em outro bairro (Boa Viagem).
    await seedReport({ type: "FIRE", latitude: -8.118, longitude: -34.902, deviceId: devId() });

    const res = await GET(await summaryRequest("", "ADMIN"));
    const body = await res.json();

    expect(body.total).toBe(2);
    expect(body.byStatus).toEqual({ pending: 1, confirmed: 1 });
    expect(body.byType.map((entry: { type: string }) => entry.type).sort()).toEqual([
      "FIRE",
      "FLOOD",
    ]);
    expect(body.regions.map((region: { region: string }) => region.region)).toContain("Afogados");
    expect(body.recent).toHaveLength(2);
    expect(body.mapPoints).toHaveLength(2);
    expect(body.recent[0]).toHaveProperty("severity");
    expect(body.recent[0]).toHaveProperty("neighborhood");
  });

  it("reflete o filtro de tipo", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });
    await seedReport({ type: "FIRE", latitude: -8.118, longitude: -34.902, deviceId: devId() });

    const res = await GET(await summaryRequest("?type=FIRE", "ADMIN"));
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.filters).toEqual({ status: null, type: "FIRE" });
  });

  it("filtro de período 'today' exclui ocorrência antiga; '30d' inclui", async () => {
    await seedReport({ type: "FLOOD", latitude: -8.073, longitude: -34.91, deviceId: devId() });
    await seedReport({
      type: "FIRE",
      latitude: -8.118,
      longitude: -34.902,
      deviceId: devId(),
      occurredAt: daysAgo(10),
    });

    const today = await GET(await summaryRequest("?period=today", "ADMIN"));
    expect((await today.json()).total).toBe(1);

    const month = await GET(await summaryRequest("?period=30d", "ADMIN"));
    expect((await month.json()).total).toBe(2);
  });

  it("retorna 400 para tipo inválido", async () => {
    const res = await GET(await summaryRequest("?type=INVALID", "ADMIN"));
    expect(res.status).toBe(400);
  });

  it("retorna 400 para período inválido", async () => {
    const res = await GET(await summaryRequest("?period=ano", "ADMIN"));
    expect(res.status).toBe(400);
  });
});
