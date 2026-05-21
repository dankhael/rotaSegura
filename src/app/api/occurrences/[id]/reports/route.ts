import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fromZodError, internalError, notFound } from "@/lib/api-response";
import { type RawReport, toReport } from "@/lib/reports/serialize";
import { paginationSchema } from "@/lib/validations/occurrence";
import type { Report } from "@/types/report";
import type { PaginatedResponse } from "@/types/support-point";

/**
 * Lista os relatos consolidados em uma ocorrência (rastreabilidade — AC8).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "occurrences" WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return notFound("Ocorrência não encontrada");
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM "reports" WHERE "occurrenceId" = ${id}
    `;
    const total = Number(countResult[0].total);

    const rows = await prisma.$queryRaw<RawReport[]>`
      SELECT id, type, latitude, longitude,
             "occurredAt", "createdAt", "deviceId", "occurrenceId"
      FROM "reports"
      WHERE "occurrenceId" = ${id}
      ORDER BY "occurredAt" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<Report> = {
      data: rows.map(toReport),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/occurrences/:id/reports]", err);
    return internalError();
  }
}
