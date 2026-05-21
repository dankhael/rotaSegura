import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fromZodError, internalError } from "@/lib/api-response";
import { type RawOccurrence, toOccurrence } from "@/lib/occurrences/serialize";
import { occurrenceListQuerySchema } from "@/lib/validations/occurrence";
import type { Occurrence } from "@/types/occurrence";
import type { PaginatedResponse } from "@/types/support-point";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = occurrenceListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { page, limit, status, type } = parsed.data;
    const offset = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM "occurrences"
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
        AND (${type ?? null}::text IS NULL OR type = ${type ?? null})
    `;
    const total = Number(countResult[0].total);

    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      SELECT id, type, status,
             "centroidLatitude", "centroidLongitude",
             "reportCount", "uniqueDeviceCount",
             "firstReportedAt", "lastReportedAt", "confirmedAt",
             "createdAt", "updatedAt"
      FROM "occurrences"
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
        AND (${type ?? null}::text IS NULL OR type = ${type ?? null})
      ORDER BY "lastReportedAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<Occurrence> = {
      data: rows.map(toOccurrence),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/occurrences]", err);
    return internalError();
  }
}
