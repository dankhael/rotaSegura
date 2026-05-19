import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { badRequest, fromZodError, internalError } from "@/lib/api-response";
import { type RawOccurrence, toOccurrence } from "@/lib/occurrences/serialize";
import { createOccurrenceSchema, paginationSchema } from "@/lib/validations/occurrence";
import type { Occurrence } from "@/types/occurrence";
import type { PaginatedResponse } from "@/types/support-point";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM "occurrences"
    `;
    const total = Number(countResult[0].total);

    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      SELECT id, type, latitude, longitude, "occurredAt", "createdAt"
      FROM "occurrences"
      ORDER BY "occurredAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<Occurrence> = {
      data: rows.map(toOccurrence),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/occurrences]", err);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = createOccurrenceSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { type, latitude, longitude, occurredAt } = parsed.data;

    const id = crypto.randomUUID();
    const now = new Date();
    const timestamp = occurredAt ?? now;

    // RETURNING evita um SELECT extra e mantém a operação atômica.
    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      INSERT INTO "occurrences" (
        id, type, latitude, longitude, location, "occurredAt", "createdAt"
      )
      VALUES (
        ${id},
        ${type},
        ${latitude},
        ${longitude},
        ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography,
        ${timestamp},
        ${now}
      )
      RETURNING id, type, latitude, longitude, "occurredAt", "createdAt"
    `;

    return NextResponse.json(toOccurrence(rows[0]), { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return fromZodError(err);
    }
    console.error("[POST /api/occurrences]", err);
    return internalError();
  }
}
