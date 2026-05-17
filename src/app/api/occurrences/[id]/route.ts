import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { internalError, notFound } from "@/lib/api-response";
import { type RawOccurrence, toOccurrence } from "@/lib/occurrences/serialize";

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
