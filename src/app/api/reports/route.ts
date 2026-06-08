import { after, NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { badRequest, fromZodError, internalError } from "@/lib/api-response";
import { clusterReport } from "@/lib/occurrences/cluster";
import { sendPushToNearbyUsers } from "@/lib/notifications/dispatch";
import { type RawReport, toReport } from "@/lib/reports/serialize";
import { createReportSchema, reportListQuerySchema } from "@/lib/validations/report";
import type { Occurrence } from "@/types/occurrence";
import type { Report } from "@/types/report";
import type { PaginatedResponse } from "@/types/support-point";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = reportListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      occurrenceId: searchParams.get("occurrenceId") ?? undefined,
      deviceId: searchParams.get("deviceId") ?? undefined,
    });

    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { page, limit, type, occurrenceId, deviceId } = parsed.data;
    const offset = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM "reports"
      WHERE (${type ?? null}::text IS NULL OR type = ${type ?? null})
        AND (${occurrenceId ?? null}::text IS NULL OR "occurrenceId" = ${occurrenceId ?? null})
        AND (${deviceId ?? null}::text IS NULL OR "deviceId" = ${deviceId ?? null})
    `;
    const total = Number(countResult[0].total);

    const rows = await prisma.$queryRaw<RawReport[]>`
      SELECT id, type, latitude, longitude,
             "occurredAt", "createdAt", "deviceId", "occurrenceId"
      FROM "reports"
      WHERE (${type ?? null}::text IS NULL OR type = ${type ?? null})
        AND (${occurrenceId ?? null}::text IS NULL OR "occurrenceId" = ${occurrenceId ?? null})
        AND (${deviceId ?? null}::text IS NULL OR "deviceId" = ${deviceId ?? null})
      ORDER BY "occurredAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<Report> = {
      data: rows.map(toReport),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/reports]", err);
    return internalError();
  }
}

// Envoltório que isola exceções de push: Promise não-aguardada não deve
// escapar para o handler. CLAUDE.md §"Exception messages" — logamos com contexto.
async function notifyNearby(occurrence: Occurrence): Promise<void> {
  try {
    await sendPushToNearbyUsers(occurrence);
  } catch (err) {
    console.error("[notifyNearby] occurrenceId=" + occurrence.id, err);
  }
}

// Agenda trabalho pós-resposta. Em produção (Next runtime) `after()` mantém a
// Function viva até a Promise resolver — evita push perdido quando a Vercel
// encerra a invocação. Em testes unit (sem request scope) `after()` lança;
// caímos para `void` que é equivalente ao comportamento anterior.
function scheduleAfterResponse(work: Promise<void>): void {
  try {
    after(work);
  } catch {
    void work;
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

    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { type, latitude, longitude, occurredAt, deviceId } = parsed.data;
    const now = new Date();

    const result = await prisma.$transaction(
      (tx) =>
        clusterReport(
          {
            type,
            latitude,
            longitude,
            occurredAt: occurredAt ?? now,
            deviceId: deviceId ?? null,
          },
          {
            tx,
            now,
            radiusM: env.CLUSTER_RADIUS_M,
            windowMin: env.CLUSTER_WINDOW_MIN,
            threshold: env.CLUSTER_THRESHOLD,
          },
        ),
      { isolationLevel: "ReadCommitted", timeout: 5000 },
    );

    // RS-TK04: dispara push para vizinhos só quando a ocorrência é promovida
    // (PENDING → CONFIRMED). Notificar em criação PENDING geraria alertas a
    // partir de relatos isolados, ainda não validados pelo threshold de US06.
    // `after()` agenda o trabalho para rodar DEPOIS da resposta sair, sem
    // arriscar a Function ser encerrada (em Vercel) com a Promise solta — que
    // era o problema do `void notifyNearby(...)` anterior. AC-09 garantido
    // pelo try/catch interno de notifyNearby.
    if (result.promoted) {
      scheduleAfterResponse(notifyNearby(result.occurrence));
    }

    // 200 idempotente quando deviceId já estava na ocorrência; 201 caso novo report.
    const status = result.duplicateDevice ? 200 : 201;
    return NextResponse.json(
      {
        report: result.report,
        occurrence: result.occurrence,
        clustering: {
          created: result.created,
          promoted: result.promoted,
          duplicateDevice: result.duplicateDevice,
        },
      },
      { status },
    );
  } catch (err) {
    console.error("[POST /api/reports]", err);
    return internalError();
  }
}
