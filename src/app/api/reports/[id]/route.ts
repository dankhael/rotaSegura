import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { internalError, notFound } from "@/lib/api-response";
import { type RawReport, toReport } from "@/lib/reports/serialize";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRaw<RawReport[]>`
      SELECT id, type, latitude, longitude,
             "occurredAt", "createdAt", "deviceId", "occurrenceId"
      FROM "reports"
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound("Relato não encontrado");
    }

    return NextResponse.json(toReport(rows[0]));
  } catch (err) {
    console.error("[GET /api/reports/:id]", err);
    return internalError();
  }
}

/**
 * Remove o relato e recomputa os agregados da ocorrência pai.
 * Se a ocorrência ficar sem relatos, é deletada (mantém invariante: occurrence
 * sempre representa ao menos 1 relato). Endpoint admin — sem auth nesta task.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ occurrenceId: string }[]>`
        DELETE FROM "reports" WHERE id = ${id}
        RETURNING "occurrenceId"
      `;

      if (rows.length === 0) {
        throw new ReportNotFound();
      }

      const occurrenceId = rows[0].occurrenceId;
      const remaining = await tx.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*) AS cnt FROM "reports" WHERE "occurrenceId" = ${occurrenceId}
      `;

      if (Number(remaining[0].cnt) === 0) {
        await tx.$executeRaw`DELETE FROM "occurrences" WHERE id = ${occurrenceId}`;
        return;
      }

      // Recomputa contadores e centróide; status não é rebaixado (uma vez confirmada,
      // permanece confirmada — manter a invariante "histórico de confirmação").
      const now = new Date();
      await tx.$executeRaw`
        UPDATE "occurrences" o
        SET
          "reportCount"       = sub.cnt,
          "uniqueDeviceCount" = sub.uniq,
          "firstReportedAt"   = sub."minAt",
          "lastReportedAt"    = sub."maxAt",
          "centroidLatitude"  = sub.clat,
          "centroidLongitude" = sub.clon,
          centroid            = ST_SetSRID(ST_MakePoint(sub.clon::float8, sub.clat::float8), 4326)::geography,
          "updatedAt"         = ${now}
        FROM (
          SELECT
            COUNT(*)::int AS cnt,
            COUNT(DISTINCT "deviceId") FILTER (WHERE "deviceId" IS NOT NULL)::int AS uniq,
            AVG(latitude)::float8  AS clat,
            AVG(longitude)::float8 AS clon,
            MIN("occurredAt")::timestamp AS "minAt",
            MAX("occurredAt")::timestamp AS "maxAt"
          FROM "reports" WHERE "occurrenceId" = ${occurrenceId}
        ) sub
        WHERE o.id = ${occurrenceId}
      `;
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ReportNotFound) {
      return notFound("Relato não encontrado");
    }
    console.error("[DELETE /api/reports/:id]", err);
    return internalError();
  }
}

class ReportNotFound extends Error {}
