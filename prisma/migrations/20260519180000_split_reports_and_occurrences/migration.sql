-- US06: separa relato individual (reports) do agregado por proximidade (occurrences).
-- Migration atômica: rename + nova tabela + backfill 1:1 + FK NOT NULL.

-- 1. Renomeia tabela antiga e seus índices/constraints para "reports"
ALTER TABLE "occurrences" RENAME TO "reports";
ALTER INDEX "occurrences_pkey" RENAME TO "reports_pkey";
ALTER INDEX "occurrences_location_idx" RENAME TO "reports_location_idx";

-- 2. Enum de status da ocorrência agregada
CREATE TYPE "OccurrenceStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- 3. Nova tabela "occurrences" como agregado
CREATE TABLE "occurrences" (
  "id"                TEXT NOT NULL,
  "type"              TEXT NOT NULL,
  "status"            "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
  "centroidLatitude"  DOUBLE PRECISION NOT NULL,
  "centroidLongitude" DOUBLE PRECISION NOT NULL,
  "centroid"          geography(Point, 4326) NOT NULL,
  "reportCount"       INTEGER NOT NULL DEFAULT 0,
  "uniqueDeviceCount" INTEGER NOT NULL DEFAULT 0,
  "firstReportedAt"   TIMESTAMP(3) NOT NULL,
  "lastReportedAt"    TIMESTAMP(3) NOT NULL,
  "confirmedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "occurrences_centroid_idx"          ON "occurrences" USING GIST ("centroid");
CREATE INDEX "occurrences_type_lastReportedAt_idx" ON "occurrences" ("type", "lastReportedAt" DESC);
CREATE INDEX "occurrences_status_idx"            ON "occurrences" ("status");

-- 4. Novos campos em reports (nullable primeiro para permitir backfill)
ALTER TABLE "reports"
  ADD COLUMN "deviceId"     TEXT,
  ADD COLUMN "occurrenceId" TEXT;

-- 5. Backfill 1:1: cada report órfão recebe uma ocorrência PENDING com o mesmo id.
--    Simples, sem extensão pgcrypto e sem risco de colisão (id já é único na origem).
INSERT INTO "occurrences" (
  id, type, status,
  "centroidLatitude", "centroidLongitude", centroid,
  "reportCount", "uniqueDeviceCount",
  "firstReportedAt", "lastReportedAt",
  "createdAt", "updatedAt"
)
SELECT
  r.id, r.type, 'PENDING'::"OccurrenceStatus",
  r.latitude, r.longitude, r.location,
  1, 0,
  r."occurredAt", r."occurredAt",
  r."createdAt", r."createdAt"
FROM "reports" r;

UPDATE "reports" SET "occurrenceId" = id WHERE "occurrenceId" IS NULL;

-- 6. Tornar occurrenceId NOT NULL + FK (CASCADE para manter integridade)
ALTER TABLE "reports"
  ALTER COLUMN "occurrenceId" SET NOT NULL,
  ADD CONSTRAINT "reports_occurrenceId_fkey"
    FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Índices em reports
CREATE INDEX "reports_occurrenceId_idx" ON "reports" ("occurrenceId");
CREATE INDEX "reports_deviceId_idx"     ON "reports" ("deviceId");
CREATE INDEX "reports_type_occurredAt_idx" ON "reports" ("type", "occurredAt" DESC);

-- Idempotência forte: mesmo deviceId não pode duplicar dentro de uma ocorrência.
-- Unique parcial (deviceId NULL é ignorado), gerenciado por SQL puro porque o
-- Prisma schema não expressa WHERE em @@unique.
CREATE UNIQUE INDEX "reports_occurrenceId_deviceId_unique"
  ON "reports" ("occurrenceId", "deviceId")
  WHERE "deviceId" IS NOT NULL;
