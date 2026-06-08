import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fromZodError, internalError, unauthorized } from "@/lib/api-response";
import { isAdminRequest } from "@/lib/auth/admin-guard";
import {
  OCCURRENCE_STATUS_LABEL,
  OCCURRENCE_TYPE_LABEL,
  SEVERITY_LABEL,
} from "@/lib/occurrences/labels";
import { nearestNeighborhood } from "@/lib/occurrences/neighborhood";
import { periodRange } from "@/lib/occurrences/period";
import { occurrenceSeverity } from "@/lib/occurrences/severity";
import { occurrenceSummaryQuerySchema } from "@/lib/validations/occurrence";
import type { OccurrenceStatus, OccurrenceType } from "@/types/occurrence";

type ExportRow = {
  id: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  centroidLatitude: number;
  centroidLongitude: number;
  reportCount: number;
  uniqueDeviceCount: number;
  firstReportedAt: Date;
  lastReportedAt: Date;
  confirmedAt: Date | null;
};

const CSV_HEADER = [
  "id",
  "tipo",
  "status",
  "gravidade",
  "bairro",
  "relatos",
  "primeiro_relato",
  "ultimo_relato",
  "confirmada_em",
];

// US10 v2: exporta as ocorrências do período (mesmos filtros do dashboard) em
// CSV. Restrito a administradores.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(request))) {
    return unauthorized("Acesso restrito a administradores");
  }

  try {
    const { searchParams } = request.nextUrl;
    const parsed = occurrenceSummaryQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      period: searchParams.get("period") ?? undefined,
    });

    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { status, type, period } = parsed.data;
    const now = new Date();
    const { start } = periodRange(period, now);

    const rows = await prisma.$queryRaw<ExportRow[]>`
      SELECT id, type, status,
             "centroidLatitude", "centroidLongitude",
             "reportCount", "uniqueDeviceCount",
             "firstReportedAt", "lastReportedAt", "confirmedAt"
      FROM "occurrences"
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
        AND (${type ?? null}::text IS NULL OR type = ${type ?? null})
        AND "firstReportedAt" >= ${start}
      ORDER BY "lastReportedAt" DESC
    `;

    const csv = [CSV_HEADER.join(","), ...rows.map(toCsvRow)].join("\n");
    const filename = `ocorrencias-${period}-${now.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/occurrences/export]", err);
    return internalError();
  }
}

function toCsvRow(row: ExportRow): string {
  const severity = occurrenceSeverity({
    type: row.type,
    status: row.status,
    reportCount: row.reportCount,
    uniqueDeviceCount: row.uniqueDeviceCount,
  });

  return [
    row.id,
    OCCURRENCE_TYPE_LABEL[row.type],
    OCCURRENCE_STATUS_LABEL[row.status],
    SEVERITY_LABEL[severity],
    nearestNeighborhood(row.centroidLatitude, row.centroidLongitude),
    String(row.reportCount),
    row.firstReportedAt.toISOString(),
    row.lastReportedAt.toISOString(),
    row.confirmedAt ? row.confirmedAt.toISOString() : "",
  ]
    .map(csvEscape)
    .join(",");
}

// Aspas em campos com vírgula/aspas/quebra; aspas internas duplicadas (RFC 4180).
function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Prisma exige runtime Node.
export const runtime = "nodejs";
