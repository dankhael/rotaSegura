import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { badRequest, fromZodError, internalError, notFound } from "@/lib/api-response";
import { type RawSupportPoint, toSupportPoint } from "@/lib/support-points/serialize";
import { updateSupportPointSchema } from "@/lib/validations/support-point";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      SELECT id, name, type, capacity, latitude, longitude, "createdAt", "updatedAt"
      FROM "support_points"
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    return NextResponse.json(toSupportPoint(rows[0]));
  } catch (err) {
    console.error("[GET /api/support-points/:id]", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = updateSupportPointSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nenhum campo válido para atualizar");
    }

    const { name, type, latitude, longitude, capacity } = parsed.data;
    const now = new Date();

    // location é sempre recalculado a partir das coords efetivas (novas ou existentes)
    // para evitar drift com as colunas latitude/longitude quando só uma delas é enviada.
    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      UPDATE "support_points"
      SET
        name = COALESCE(${name ?? null}, name),
        type = COALESCE(${type ?? null}, type),
        capacity = CASE
          WHEN ${capacity === null} THEN NULL
          ELSE COALESCE(${capacity ?? null}, capacity)
        END,
        latitude = COALESCE(${latitude ?? null}, latitude),
        longitude = COALESCE(${longitude ?? null}, longitude),
        location = ST_SetSRID(
          ST_MakePoint(
            COALESCE(${longitude ?? null}::float8, longitude),
            COALESCE(${latitude ?? null}::float8, latitude)
          ),
          4326
        )::geography,
        "updatedAt" = ${now}
      WHERE id = ${id}
      RETURNING id, name, type, capacity, latitude, longitude, "createdAt", "updatedAt"
    `;

    if (rows.length === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    return NextResponse.json(toSupportPoint(rows[0]));
  } catch (err) {
    console.error("[PATCH /api/support-points/:id]", err);
    return internalError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await prisma.$executeRaw`
      DELETE FROM "support_points" WHERE id = ${id}
    `;

    if (result === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/support-points/:id]", err);
    return internalError();
  }
}
