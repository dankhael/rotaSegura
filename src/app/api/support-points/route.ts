// src/app/api/support-points/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { badRequest, fromZodError, internalError } from "@/lib/api-response";
import { createSupportPointSchema, paginationSchema } from "@/lib/validations/support-point";
import type { SupportPoint, PaginatedResponse } from "@/types/support-point";

// Tipo interno que reflete o resultado do $queryRaw com colunas físicas
type RawSupportPoint = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Converte a linha bruta do banco para o formato de contrato da API (SupportPoint)
 */
function toSupportPoint(row: RawSupportPoint): SupportPoint {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SupportPoint["type"],
    capacity: row.capacity,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── GET /api/support-points ──────────────────────────────────────────────────

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
      SELECT COUNT(*) AS total FROM "support_points"
    `;
    const total = Number(countResult[0].total);

    // Busca utilizando as colunas físicas para maior performance
    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      SELECT
        id, name, type, capacity,
        latitude,
        longitude,
        "createdAt",
        "updatedAt"
      FROM "support_points"
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<SupportPoint> = {
      data: rows.map(toSupportPoint),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/support-points]", err);
    return internalError();
  }
}

// ─── POST /api/support-points ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = createSupportPointSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { name, type, latitude, longitude, capacity } = parsed.data;

    const id = crypto.randomUUID();
    const now = new Date();

    // RETURNING evita um SELECT extra e mantém a operação atômica.
    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      INSERT INTO "support_points" (
        id, name, type, capacity, latitude, longitude, location, "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${name},
        ${type},
        ${capacity ?? null},
        ${latitude},
        ${longitude},
        ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography,
        ${now},
        ${now}
      )
      RETURNING id, name, type, capacity, latitude, longitude, "createdAt", "updatedAt"
    `;

    return NextResponse.json(toSupportPoint(rows[0]), { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return fromZodError(err);
    }
    console.error("[POST /api/support-points]", err);
    return internalError();
  }
}
