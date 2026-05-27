import { Prisma } from "@prisma/client";

import {
  OCCURRENCE_SELECT_COLUMNS,
  type RawOccurrence,
  toOccurrence,
} from "@/lib/occurrences/serialize";
import { REPORT_SELECT_COLUMNS, type RawReport, toReport } from "@/lib/reports/serialize";
import type { Occurrence } from "@/types/occurrence";
import type { Report, ReportType } from "@/types/report";

export type ClusterDeps = {
  tx: Prisma.TransactionClient;
  now: Date;
  radiusM: number;
  windowMin: number;
  threshold: number;
};

export type ClusterInput = {
  type: ReportType;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  deviceId: string | null;
};

export type ClusterResult = {
  report: Report;
  occurrence: Occurrence;
  /** Nova ocorrência foi criada nesta chamada. */
  created: boolean;
  /** Status mudou de PENDING para CONFIRMED nesta chamada. */
  promoted: boolean;
  /** Já havia report do mesmo deviceId nesta ocorrência. */
  duplicateDevice: boolean;
};

type CandidateRow = {
  id: string;
  status: "PENDING" | "CONFIRMED";
};

/**
 * Agrega um relato a uma ocorrência existente ou cria uma nova (US06).
 *
 * Regras:
 *  - Candidata: mesma `type`, status ativo, centroid dentro de `radiusM`,
 *    `lastReportedAt` dentro da janela de `windowMin`.
 *  - Idempotência: mesmo `deviceId` na mesma ocorrência → noop, retorna o report anterior.
 *  - Threshold: ao atingir `uniqueDeviceCount >= threshold`, PENDING → CONFIRMED.
 *  - `deviceId` ausente conta em `reportCount` mas não em `uniqueDeviceCount`.
 *
 * Race conditions:
 *  - `pg_advisory_xact_lock` por bucket (type + lat/lon arredondado) serializa
 *    criações simultâneas na mesma vizinhança.
 *  - `SELECT ... FOR UPDATE` serializa updates concorrentes na mesma ocorrência.
 *
 * Deve ser chamado dentro de `prisma.$transaction`.
 */
export async function clusterReport(
  input: ClusterInput,
  deps: ClusterDeps,
): Promise<ClusterResult> {
  const { tx, now, radiusM, windowMin, threshold } = deps;
  const { type, latitude, longitude } = input;

  await acquireBucketLock(tx, type, latitude, longitude);

  const candidate = await findCandidateOccurrence(tx, {
    type,
    latitude,
    longitude,
    radiusM,
    windowMin,
    now,
  });

  if (!candidate) {
    return createOccurrenceWithReport(tx, input, now);
  }

  return appendReportToCandidate(tx, candidate, input, threshold, now);
}

async function acquireBucketLock(
  tx: Prisma.TransactionClient,
  type: ReportType,
  latitude: number,
  longitude: number,
) {
  // Bucket ~0.001° (~100m) — granularidade pequena evita travar regiões distantes.
  const bucketKey = `${type}:${Math.floor(latitude * 1000)}:${Math.floor(longitude * 1000)}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${bucketKey}))`;
}

type FindCandidateArgs = {
  type: ReportType;
  latitude: number;
  longitude: number;
  radiusM: number;
  windowMin: number;
  now: Date;
};

async function findCandidateOccurrence(
  tx: Prisma.TransactionClient,
  args: FindCandidateArgs,
): Promise<CandidateRow | null> {
  const { type, latitude, longitude, radiusM, windowMin, now } = args;
  const windowStart = new Date(now.getTime() - windowMin * 60_000);

  // FOR UPDATE serializa concorrentes que peguem o mesmo cluster.
  const rows = await tx.$queryRaw<CandidateRow[]>`
    SELECT id, status
    FROM "occurrences"
    WHERE type = ${type}
      AND status IN ('PENDING', 'CONFIRMED')
      AND ST_DWithin(
        centroid,
        ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography,
        ${radiusM}::float8
      )
      AND "lastReportedAt" >= ${windowStart}
    ORDER BY ST_Distance(
      centroid,
      ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography
    ) ASC
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

async function createOccurrenceWithReport(
  tx: Prisma.TransactionClient,
  input: ClusterInput,
  now: Date,
): Promise<ClusterResult> {
  const { type, latitude, longitude, occurredAt, deviceId } = input;
  const occurrenceId = crypto.randomUUID();
  const uniqueDeviceCount = deviceId ? 1 : 0;

  const occRows = await tx.$queryRawUnsafe<RawOccurrence[]>(
    `
      INSERT INTO "occurrences" (
        id, type, status,
        "centroidLatitude", "centroidLongitude", centroid,
        "reportCount", "uniqueDeviceCount",
        "firstReportedAt", "lastReportedAt",
        "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, 'PENDING',
        $3, $4,
        ST_SetSRID(ST_MakePoint($4::float8, $3::float8), 4326)::geography,
        1, $5,
        $6, $6,
        $7, $7
      )
      RETURNING ${OCCURRENCE_SELECT_COLUMNS}
    `,
    occurrenceId,
    type,
    latitude,
    longitude,
    uniqueDeviceCount,
    occurredAt,
    now,
  );

  const report = await insertReport(tx, input, occurrenceId, now);

  return {
    report,
    occurrence: toOccurrence(occRows[0]),
    created: true,
    promoted: false,
    duplicateDevice: false,
  };
}

async function appendReportToCandidate(
  tx: Prisma.TransactionClient,
  candidate: CandidateRow,
  input: ClusterInput,
  threshold: number,
  now: Date,
): Promise<ClusterResult> {
  // SAVEPOINT permite recuperar de unique violation sem abortar a transação inteira.
  // Postgres marca a txn como "aborted" após qualquer erro de SQL; só ROLLBACK TO
  // SAVEPOINT (não DML) é permitido até que a txn seja revertida.
  await tx.$executeRawUnsafe(`SAVEPOINT cluster_insert_report`);
  let report;
  try {
    report = await insertReport(tx, input, candidate.id, now);
  } catch (err) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT cluster_insert_report`);
    if (!isUniqueDeviceViolation(err)) throw err;
    return handleDuplicateDevice(tx, candidate.id, input.deviceId!);
  }
  await tx.$executeRawUnsafe(`RELEASE SAVEPOINT cluster_insert_report`);
  const { occurrence, promoted } = await recomputeAggregates(tx, candidate, threshold, now);
  return { report, occurrence, created: false, promoted, duplicateDevice: false };
}

async function insertReport(
  tx: Prisma.TransactionClient,
  input: ClusterInput,
  occurrenceId: string,
  now: Date,
): Promise<Report> {
  const { type, latitude, longitude, occurredAt, deviceId } = input;
  const reportId = crypto.randomUUID();

  const rows = await tx.$queryRawUnsafe<RawReport[]>(
    `
      INSERT INTO "reports" (
        id, type, latitude, longitude, location,
        "occurredAt", "createdAt", "deviceId", "occurrenceId"
      )
      VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($4::float8, $3::float8), 4326)::geography,
        $5, $6, $7, $8
      )
      RETURNING ${REPORT_SELECT_COLUMNS}
    `,
    reportId,
    type,
    latitude,
    longitude,
    occurredAt,
    now,
    deviceId,
    occurrenceId,
  );

  return toReport(rows[0]);
}

async function recomputeAggregates(
  tx: Prisma.TransactionClient,
  candidate: CandidateRow,
  threshold: number,
  now: Date,
): Promise<{ occurrence: Occurrence; promoted: boolean }> {
  // Centróide aritmético: barato e correto em escalas curtas (≤ poucos km).
  // ST_Centroid em geography exigiria MultiPoint; AVG sobre lat/lon escalares
  // entrega o mesmo resultado para clusters pequenos.
  const rows = await tx.$queryRaw<RawOccurrence[]>`
    UPDATE "occurrences" o
    SET
      "reportCount"       = sub.cnt,
      "uniqueDeviceCount" = sub.uniq,
      "firstReportedAt"   = LEAST(o."firstReportedAt", sub."minAt"),
      "lastReportedAt"    = GREATEST(o."lastReportedAt", sub."maxAt"),
      "centroidLatitude"  = sub.clat,
      "centroidLongitude" = sub.clon,
      centroid            = ST_SetSRID(ST_MakePoint(sub.clon::float8, sub.clat::float8), 4326)::geography,
      status              = CASE
                              WHEN o.status = 'PENDING' AND sub.uniq >= ${threshold}
                              THEN 'CONFIRMED'::"OccurrenceStatus"
                              ELSE o.status
                            END,
      "confirmedAt"       = CASE
                              WHEN o.status = 'PENDING' AND sub.uniq >= ${threshold}
                              THEN ${now}
                              ELSE o."confirmedAt"
                            END,
      "updatedAt"         = ${now}
    FROM (
      SELECT
        COUNT(*)::int AS cnt,
        COUNT(DISTINCT "deviceId") FILTER (WHERE "deviceId" IS NOT NULL)::int AS uniq,
        AVG(latitude)::float8  AS clat,
        AVG(longitude)::float8 AS clon,
        MIN("occurredAt")::timestamp AS "minAt",
        MAX("occurredAt")::timestamp AS "maxAt"
      FROM "reports"
      WHERE "occurrenceId" = ${candidate.id}
    ) sub
    WHERE o.id = ${candidate.id}
    RETURNING
      o.id, o.type, o.status,
      o."centroidLatitude", o."centroidLongitude",
      o."reportCount", o."uniqueDeviceCount",
      o."firstReportedAt", o."lastReportedAt", o."confirmedAt",
      o."createdAt", o."updatedAt"
  `;

  const occurrence = toOccurrence(rows[0]);
  const promoted = candidate.status === "PENDING" && occurrence.status === "CONFIRMED";
  return { occurrence, promoted };
}

async function handleDuplicateDevice(
  tx: Prisma.TransactionClient,
  occurrenceId: string,
  deviceId: string,
): Promise<ClusterResult> {
  const reports = await tx.$queryRaw<RawReport[]>`
    SELECT id, type, latitude, longitude,
           "occurredAt", "createdAt", "deviceId", "occurrenceId"
    FROM "reports"
    WHERE "occurrenceId" = ${occurrenceId} AND "deviceId" = ${deviceId}
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;
  const occs = await tx.$queryRaw<RawOccurrence[]>`
    SELECT id, type, status,
           "centroidLatitude", "centroidLongitude",
           "reportCount", "uniqueDeviceCount",
           "firstReportedAt", "lastReportedAt", "confirmedAt",
           "createdAt", "updatedAt"
    FROM "occurrences" WHERE id = ${occurrenceId}
  `;

  return {
    report: toReport(reports[0]),
    occurrence: toOccurrence(occs[0]),
    created: false,
    promoted: false,
    duplicateDevice: true,
  };
}

function isUniqueDeviceViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  // P2010 = raw query error; meta.code '23505' = Postgres unique_violation.
  // P2002 = unique constraint violation (caso o Prisma reconheça o índice).
  if (err.code === "P2002") return true;
  if (err.code === "P2010") {
    const meta = err.meta as { code?: string } | undefined;
    return meta?.code === "23505";
  }
  return false;
}
