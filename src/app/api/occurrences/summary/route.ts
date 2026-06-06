import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fromZodError, internalError, unauthorized } from "@/lib/api-response";
import { isAdminRequest } from "@/lib/auth/admin-guard";
import { periodRange } from "@/lib/occurrences/period";
import { buildOccurrenceSummary, type SummarizableOccurrence } from "@/lib/occurrences/summary";
import { toDate } from "@/lib/occurrences/summary-trends";
import { occurrenceSummaryQuerySchema } from "@/lib/validations/occurrence";
import type { OccurrenceSummary } from "@/types/occurrence-summary";

type SummaryResponse = OccurrenceSummary & {
  filters: { status: string | null; type: string | null };
};

// US10 v2: resumo agregado das ocorrências para o dashboard admin, com filtros
// de tipo/status e janela de período. Restrito a administradores.
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
    const { start, previousStart } = periodRange(period, now);

    // Uma varredura cobre janela atual + anterior (firstReportedAt >= previousStart);
    // o split em JS evita uma segunda query. Aceitável na escala do estudo —
    // empurrar agregação pro SQL fica como evolução.
    const rows = await prisma.$queryRaw<SummarizableOccurrence[]>`
      SELECT id, type, status,
             "centroidLatitude", "centroidLongitude",
             "reportCount", "uniqueDeviceCount",
             "firstReportedAt", "lastReportedAt", "confirmedAt"
      FROM "occurrences"
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
        AND (${type ?? null}::text IS NULL OR type = ${type ?? null})
        AND "firstReportedAt" >= ${previousStart}
    `;

    const current = rows.filter((row) => toDate(row.firstReportedAt) >= start);
    const previous = rows.filter((row) => toDate(row.firstReportedAt) < start);

    const summary = buildOccurrenceSummary({ current, previous, period, start, now });
    const body: SummaryResponse = {
      ...summary,
      filters: { status: status ?? null, type: type ?? null },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/occurrences/summary]", err);
    return internalError();
  }
}

// Prisma exige runtime Node.
export const runtime = "nodejs";
