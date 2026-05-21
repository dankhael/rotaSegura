import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { internalError, notFound } from "@/lib/api-response";
import { type RawOccurrence, toOccurrence } from "@/lib/occurrences/serialize";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRaw<RawOccurrence[]>`
      SELECT id, type, status,
             "centroidLatitude", "centroidLongitude",
             "reportCount", "uniqueDeviceCount",
             "firstReportedAt", "lastReportedAt", "confirmedAt",
             "createdAt", "updatedAt"
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

/**
 * Remove a ocorrência e seus relatos (cascade via FK). Endpoint admin — sem auth
 * nesta task. PATCH foi removido: ocorrência é estado derivado dos reports.
 */
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
