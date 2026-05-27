/**
 * @vitest-environment node
 *
 * Testes de INTEGRAÇÃO da função pura `clusterReport` (US06).
 * Injetam deps (radius/window/threshold) para isolamento sem mexer em env globais.
 * Requerem o banco rodando (npm run db:up).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { prisma } from "@/lib/db";
import { clusterReport, type ClusterDeps, type ClusterInput } from "@/lib/occurrences/cluster";

const DEFAULT_RADIUS_M = 200;
const DEFAULT_WINDOW_MIN = 120;
const DEFAULT_THRESHOLD = 3;
const BASE_LAT = -8.057838;
const BASE_LON = -34.88275;

async function runCluster(input: Partial<ClusterInput>, deps: Partial<ClusterDeps> = {}) {
  const now = deps.now ?? new Date();
  return prisma.$transaction(
    (tx) =>
      clusterReport(
        {
          type: input.type ?? "FLOOD",
          latitude: input.latitude ?? BASE_LAT,
          longitude: input.longitude ?? BASE_LON,
          occurredAt: input.occurredAt ?? now,
          deviceId: input.deviceId ?? null,
        },
        {
          tx,
          now,
          radiusM: deps.radiusM ?? DEFAULT_RADIUS_M,
          windowMin: deps.windowMin ?? DEFAULT_WINDOW_MIN,
          threshold: deps.threshold ?? DEFAULT_THRESHOLD,
        },
      ),
    { isolationLevel: "ReadCommitted", timeout: 5000 },
  );
}

function deviceId(): string {
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

describe("clusterReport — relato isolado (AC1, AC3, AC5)", () => {
  it("cria nova occurrence PENDING com centroid = ponto do report", async () => {
    const result = await runCluster({ deviceId: deviceId() });

    expect(result.created).toBe(true);
    expect(result.promoted).toBe(false);
    expect(result.duplicateDevice).toBe(false);
    expect(result.occurrence.status).toBe("PENDING");
    expect(result.occurrence.reportCount).toBe(1);
    expect(result.occurrence.uniqueDeviceCount).toBe(1);
    expect(result.occurrence.centroidLatitude).toBeCloseTo(BASE_LAT, 5);
    expect(result.occurrence.centroidLongitude).toBeCloseTo(BASE_LON, 5);
    expect(result.report.occurrenceId).toBe(result.occurrence.id);
  });

  it("report sem deviceId conta em reportCount mas não em uniqueDeviceCount (AC6 corolário)", async () => {
    const result = await runCluster({});
    expect(result.occurrence.reportCount).toBe(1);
    expect(result.occurrence.uniqueDeviceCount).toBe(0);
  });
});

describe("clusterReport — elevação por threshold (AC4)", () => {
  it("3 reports de devices distintos no mesmo lugar elevam para CONFIRMED", async () => {
    const r1 = await runCluster({ deviceId: deviceId() });
    const r2 = await runCluster({ deviceId: deviceId() });
    const r3 = await runCluster({ deviceId: deviceId() });

    expect(r1.occurrence.status).toBe("PENDING");
    expect(r2.occurrence.status).toBe("PENDING");
    expect(r3.occurrence.status).toBe("CONFIRMED");
    expect(r3.promoted).toBe(true);
    expect(r3.occurrence.confirmedAt).not.toBeNull();
    expect(r3.occurrence.uniqueDeviceCount).toBe(3);

    // Mesma occurrence em todos os 3
    expect(r2.occurrence.id).toBe(r1.occurrence.id);
    expect(r3.occurrence.id).toBe(r1.occurrence.id);
  });

  it("threshold injetado (2) eleva no segundo report", async () => {
    const deps = { threshold: 2 };
    await runCluster({ deviceId: deviceId() }, deps);
    const r2 = await runCluster({ deviceId: deviceId() }, deps);
    expect(r2.occurrence.status).toBe("CONFIRMED");
    expect(r2.promoted).toBe(true);
  });

  it("uma vez CONFIRMED, novos reports do mesmo cluster mantêm status (não rebaixa)", async () => {
    const deps = { threshold: 2 };
    await runCluster({ deviceId: deviceId() }, deps);
    const r2 = await runCluster({ deviceId: deviceId() }, deps);
    const r3 = await runCluster({ deviceId: deviceId() }, deps);
    expect(r2.occurrence.status).toBe("CONFIRMED");
    expect(r3.occurrence.status).toBe("CONFIRMED");
    expect(r3.promoted).toBe(false);
  });
});

describe("clusterReport — fora do raio (AC1 negativo)", () => {
  it("report a ~500m do primeiro (raio=200m) cria nova occurrence", async () => {
    // ~0.005° latitude ≈ 555m
    const r1 = await runCluster({ deviceId: deviceId() });
    const r2 = await runCluster({
      latitude: BASE_LAT + 0.005,
      longitude: BASE_LON,
      deviceId: deviceId(),
    });

    expect(r2.created).toBe(true);
    expect(r2.occurrence.id).not.toBe(r1.occurrence.id);
  });
});

describe("clusterReport — fora da janela (AC2)", () => {
  it("report 3h depois (janela=120min) cria nova occurrence", async () => {
    const t0 = new Date("2026-05-19T10:00:00Z");
    const t1 = new Date("2026-05-19T13:30:00Z"); // 3h30 depois

    const r1 = await runCluster({ deviceId: deviceId() }, { now: t0 });
    const r2 = await runCluster({ deviceId: deviceId() }, { now: t1 });

    expect(r2.created).toBe(true);
    expect(r2.occurrence.id).not.toBe(r1.occurrence.id);
  });
});

describe("clusterReport — idempotência por deviceId (AC6)", () => {
  it("5 reports do mesmo deviceId resultam em uniqueDeviceCount=1, sem elevar", async () => {
    const dev = deviceId();
    const results = [] as Awaited<ReturnType<typeof runCluster>>[];
    for (let i = 0; i < 5; i++) {
      results.push(await runCluster({ deviceId: dev }));
    }

    expect(results[0].duplicateDevice).toBe(false);
    for (let i = 1; i < 5; i++) {
      expect(results[i].duplicateDevice).toBe(true);
      expect(results[i].promoted).toBe(false);
    }

    const final = results[4].occurrence;
    expect(final.reportCount).toBe(1);
    expect(final.uniqueDeviceCount).toBe(1);
    expect(final.status).toBe("PENDING");

    // Todos retornam o mesmo report.id (idempotência forte)
    const uniqueReportIds = new Set(results.map((r) => r.report.id));
    expect(uniqueReportIds.size).toBe(1);
  });
});

describe("clusterReport — recálculo de centróide (AC5)", () => {
  it("4 reports em quadrado → centroid ≈ média aritmética das coordenadas", async () => {
    const offsets = [
      [0.0005, 0.0005],
      [0.0005, -0.0005],
      [-0.0005, 0.0005],
      [-0.0005, -0.0005],
    ];

    let lastResult;
    for (const [dlat, dlon] of offsets) {
      lastResult = await runCluster({
        latitude: BASE_LAT + dlat,
        longitude: BASE_LON + dlon,
        deviceId: deviceId(),
      });
    }

    expect(lastResult!.occurrence.centroidLatitude).toBeCloseTo(BASE_LAT, 5);
    expect(lastResult!.occurrence.centroidLongitude).toBeCloseTo(BASE_LON, 5);
    expect(lastResult!.occurrence.reportCount).toBe(4);
  });
});

describe("clusterReport — tipos diferentes não se agrupam (AC1)", () => {
  it("FLOOD e FIRE no mesmo lugar viram duas occurrences", async () => {
    const flood = await runCluster({ type: "FLOOD", deviceId: deviceId() });
    const fire = await runCluster({ type: "FIRE", deviceId: deviceId() });

    expect(fire.created).toBe(true);
    expect(fire.occurrence.id).not.toBe(flood.occurrence.id);
  });
});

describe("clusterReport — race condition (AC1 sob concorrência)", () => {
  it("dois POSTs simultâneos sem occurrence prévia → exatamente 1 occurrence", async () => {
    const [r1, r2] = await Promise.all([
      runCluster({ deviceId: deviceId() }),
      runCluster({
        deviceId: deviceId(),
        latitude: BASE_LAT + 0.0001,
        longitude: BASE_LON + 0.0001,
      }),
    ]);

    // Advisory lock por bucket deve ter serializado: ambos referenciam o mesmo cluster.
    const occRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences"
    `;
    expect(occRows).toHaveLength(1);
    expect(r1.occurrence.id).toBe(r2.occurrence.id);
  });
});

describe("clusterReport — janela conta a partir de lastReportedAt", () => {
  it("report novo 'reativa' a janela: 3º report 4h depois do 1º ainda agrupa se 2º foi recente", async () => {
    const t0 = new Date("2026-05-19T10:00:00Z");
    const t1 = new Date("2026-05-19T11:30:00Z"); // 1h30 — dentro
    const t2 = new Date("2026-05-19T13:00:00Z"); // 1h30 do t1 — dentro

    const r1 = await runCluster({ deviceId: deviceId() }, { now: t0 });
    const r2 = await runCluster({ deviceId: deviceId() }, { now: t1 });
    const r3 = await runCluster({ deviceId: deviceId() }, { now: t2 });

    expect(r2.occurrence.id).toBe(r1.occurrence.id);
    expect(r3.occurrence.id).toBe(r1.occurrence.id);
    expect(r3.occurrence.reportCount).toBe(3);
  });
});
