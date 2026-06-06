import { PrismaClient } from "@prisma/client";

import { clusterReport } from "@/lib/occurrences/cluster";
import type { OccurrenceType } from "@/types/occurrence";
import type { SupportPointType } from "@/types/support-point";

// Seed de desenvolvimento para o dashboard admin e o mapa (US10 v2). Cria
// ocorrências passando pelo clusterReport (US06) — em vez de inserir em
// "occurrences" direto — para que status, centróide e contadores reflitam a
// regra real, e pontos de apoio (abrigos, médico, suprimentos) para o mapa.
const prisma = new PrismaClient();

// Mesmos defaults de src/lib/env.ts. Lidos de process.env para casar com o
// ambiente local sem importar env.ts (que também exige JWT_SECRET).
const RADIUS_M = Number(process.env.CLUSTER_RADIUS_M ?? 200);
const WINDOW_MIN = Number(process.env.CLUSTER_WINDOW_MIN ?? 120);
const THRESHOLD = Number(process.env.CLUSTER_THRESHOLD ?? 3);

const DAY_MS = 86_400_000;
// Espaçamento entre relatos de um mesmo cluster (dentro da janela de 120min),
// para a confirmação não acontecer no mesmo instante do 1º relato — assim o
// "tempo médio até confirmação" do dashboard fica > 0.
const STAGGER_MS = 15 * 60_000;

// Cada spec vira `reports` relatos (devices distintos) no mesmo ponto/tipo:
// reports >= THRESHOLD confirma a ocorrência, abaixo fica PENDING. Pontos em
// bairros reais de Recife e `dayOffset` espalhado por ~30 dias alimentam o
// agrupamento por bairro, a série temporal e o filtro de período. Coordenadas
// distintas (> ~300m) evitam que specs de dias diferentes se fundam.
type OccurrenceSpec = {
  type: OccurrenceType;
  latitude: number;
  longitude: number;
  reports: number;
  dayOffset: number;
};

const SEED_SPECS: OccurrenceSpec[] = [
  // Últimos 7 dias (aparecem no período padrão).
  { type: "FLOOD", latitude: -8.073, longitude: -34.91, reports: 3, dayOffset: 0 },
  { type: "FIRE", latitude: -8.052, longitude: -34.913, reports: 3, dayOffset: 0 },
  { type: "ACCIDENT", latitude: -8.118, longitude: -34.902, reports: 1, dayOffset: 1 },
  { type: "LANDSLIDE", latitude: -8.13, longitude: -34.935, reports: 4, dayOffset: 1 },
  { type: "FLOOD", latitude: -8.063, longitude: -34.871, reports: 2, dayOffset: 2 },
  { type: "OBSTRUCTION", latitude: -8.045, longitude: -34.917, reports: 1, dayOffset: 2 },
  { type: "FIRE", latitude: -8.095, longitude: -34.945, reports: 1, dayOffset: 3 },
  { type: "ACCIDENT", latitude: -8.105, longitude: -34.915, reports: 3, dayOffset: 3 },
  { type: "FLOOD", latitude: -8.09, longitude: -34.885, reports: 5, dayOffset: 4 },
  { type: "OTHER", latitude: -8.02, longitude: -34.915, reports: 1, dayOffset: 4 },
  { type: "LANDSLIDE", latitude: -8.135, longitude: -34.945, reports: 1, dayOffset: 5 },
  { type: "OBSTRUCTION", latitude: -8.06, longitude: -34.889, reports: 2, dayOffset: 5 },
  { type: "FIRE", latitude: -8.045, longitude: -34.965, reports: 3, dayOffset: 6 },
  { type: "ACCIDENT", latitude: -8.055, longitude: -34.93, reports: 2, dayOffset: 6 },
  // 8–28 dias atrás (aparecem em "30 dias").
  { type: "FLOOD", latitude: -8.078, longitude: -34.913, reports: 4, dayOffset: 9 },
  { type: "OTHER", latitude: -8.01, longitude: -34.935, reports: 2, dayOffset: 11 },
  { type: "FIRE", latitude: -8.035, longitude: -34.918, reports: 1, dayOffset: 13 },
  { type: "LANDSLIDE", latitude: -8.133, longitude: -34.939, reports: 3, dayOffset: 15 },
  { type: "ACCIDENT", latitude: -8.04, longitude: -34.897, reports: 1, dayOffset: 18 },
  { type: "FLOOD", latitude: -8.055, longitude: -34.916, reports: 2, dayOffset: 21 },
  { type: "OBSTRUCTION", latitude: -8.043, longitude: -34.901, reports: 1, dayOffset: 24 },
  { type: "FIRE", latitude: -8.045, longitude: -34.888, reports: 4, dayOffset: 28 },
];

// Pontos de apoio reais de Recife para o mapa (abrigos, atendimento médico,
// suprimentos). `capacity` só faz sentido para abrigos/suprimentos.
type SupportPointSpec = {
  name: string;
  type: SupportPointType;
  latitude: number;
  longitude: number;
  capacity: number | null;
};

const SUPPORT_POINT_SPECS: SupportPointSpec[] = [
  {
    name: "Ginásio Geraldão",
    type: "SHELTER",
    latitude: -8.085,
    longitude: -34.895,
    capacity: 800,
  },
  {
    name: "Escola Municipal de Afogados",
    type: "SHELTER",
    latitude: -8.075,
    longitude: -34.912,
    capacity: 300,
  },
  {
    name: "Centro Comunitário do Ibura",
    type: "SHELTER",
    latitude: -8.131,
    longitude: -34.936,
    capacity: 250,
  },
  {
    name: "Escola do Recife Antigo",
    type: "SHELTER",
    latitude: -8.063,
    longitude: -34.873,
    capacity: 200,
  },
  {
    name: "Hospital da Restauração",
    type: "MEDICAL",
    latitude: -8.052,
    longitude: -34.905,
    capacity: null,
  },
  { name: "UPA Boa Viagem", type: "MEDICAL", latitude: -8.12, longitude: -34.905, capacity: null },
  {
    name: "Posto de Saúde de Tejipió",
    type: "MEDICAL",
    latitude: -8.096,
    longitude: -34.946,
    capacity: null,
  },
  {
    name: "Centro de Distribuição Madalena",
    type: "SUPPLY",
    latitude: -8.053,
    longitude: -34.914,
    capacity: 1000,
  },
  {
    name: "Ponto de Coleta Casa Amarela",
    type: "SUPPLY",
    latitude: -8.022,
    longitude: -34.916,
    capacity: 500,
  },
  {
    name: "Armazém do Cordeiro",
    type: "SUPPLY",
    latitude: -8.055,
    longitude: -34.931,
    capacity: 600,
  },
  {
    name: "Ponto de Apoio da Várzea",
    type: "OTHER",
    latitude: -8.046,
    longitude: -34.964,
    capacity: null,
  },
];

async function clearOccurrenceData(): Promise<void> {
  // Ordem importa: reports referenciam occurrences via FK.
  await prisma.$executeRaw`DELETE FROM "reports"`;
  await prisma.$executeRaw`DELETE FROM "occurrences"`;
  await prisma.$executeRaw`DELETE FROM "support_points"`;
}

async function seedSupportPoints(now: Date): Promise<void> {
  // INSERT raw com a coluna geography, espelhando POST /api/support-points.
  for (const point of SUPPORT_POINT_SPECS) {
    await prisma.$executeRaw`
      INSERT INTO "support_points" (
        id, name, type, capacity, latitude, longitude, location, "createdAt", "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${point.name}, ${point.type}, ${point.capacity},
        ${point.latitude}, ${point.longitude},
        ST_SetSRID(ST_MakePoint(${point.longitude}::float8, ${point.latitude}::float8), 4326)::geography,
        ${now}, ${now}
      )
    `;
  }
}

async function seedSpec(spec: OccurrenceSpec, baseNow: Date): Promise<void> {
  const day = new Date(baseNow.getTime() - spec.dayOffset * DAY_MS);

  // Um relato por transação, espelhando POST /api/reports — o advisory lock do
  // clusterReport é por transação. `now` = instante do relato para a janela de
  // clustering casar com o dia (permitindo confirmação no passado).
  for (let i = 0; i < spec.reports; i++) {
    const occurredAt = new Date(day.getTime() - (spec.reports - 1 - i) * STAGGER_MS);
    await prisma.$transaction(
      (tx) =>
        clusterReport(
          {
            type: spec.type,
            latitude: spec.latitude,
            longitude: spec.longitude,
            occurredAt,
            deviceId: crypto.randomUUID(),
          },
          { tx, now: occurredAt, radiusM: RADIUS_M, windowMin: WINDOW_MIN, threshold: THRESHOLD },
        ),
      { isolationLevel: "ReadCommitted", timeout: 5000 },
    );
  }
}

async function main(): Promise<void> {
  await clearOccurrenceData();

  const baseNow = new Date();
  for (const spec of SEED_SPECS) {
    await seedSpec(spec, baseNow);
  }
  await seedSupportPoints(baseNow);

  const byStatus = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status::text AS status, COUNT(*) AS count
    FROM "occurrences"
    GROUP BY status
    ORDER BY status
  `;
  const reportCount = await prisma.report.count();
  const supportPointCount = await prisma.supportPoint.count();

  console.log("[seed:occurrences] pronto:");
  for (const row of byStatus) {
    console.log(`  ${row.status}: ${Number(row.count)} ocorrência(s)`);
  }
  console.log(`  reports: ${reportCount}`);
  console.log(`  pontos de apoio: ${supportPointCount}`);
}

main()
  .catch((err) => {
    console.error("[seed:occurrences] falhou:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
