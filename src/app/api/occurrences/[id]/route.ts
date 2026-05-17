import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { badRequest, fromZodError, internalError, notFound } from "@/lib/api-response";
import { type RawOccurrence, toOccurrence } from "@/lib/occurrences/serialize";
import { updateOccurrenceSchema } from "@/lib/validations/occurrence";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      SELECT id, type, latitude, longitude, "occurredAt", "createdAt"
      FROM "occurrences"
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound("Ocorrência não encontrada");
    }

    return NextResponse.json(toOccurrence(rows[0]));
  } catch (err) {
    console.error("[GET /api/occurrences/:id]", err);
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

    const parsed = updateOccurrenceSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nenhum campo válido para atualizar");
    }

    const { type, latitude, longitude, occurredAt } = parsed.data;

    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      UPDATE "occurrences"
      SET
        type = COALESCE(${type ?? null}, type),
        latitude = COALESCE(${latitude ?? null}, latitude),
        longitude = COALESCE(${longitude ?? null}, longitude),
        location = ST_SetSRID(
          ST_MakePoint(
            COALESCE(${longitude ?? null}::float8, longitude),
            COALESCE(${latitude ?? null}::float8, latitude)
          ),
          4326
        )::geography,
        "occurredAt" = COALESCE(${occurredAt ?? null}, "occurredAt")
      WHERE id = ${id}
      RETURNING id, type, latitude, longitude, "occurredAt", "createdAt"
    `;

    if (rows.length === 0) {
      return notFound("Ocorrência não encontrada");
    }

    return NextResponse.json(toOccurrence(rows[0]));
  } catch (err) {
    console.error("[PATCH /api/occurrences/:id]", err);
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
      DELETE FROM "occurrences" WHERE id = ${id}
    `;

    if (result === 0) {
      return notFound("Ocorrência não encontrada");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/occurrences/:id]", err);
    return internalError();
  }
}
