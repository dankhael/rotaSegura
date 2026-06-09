import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  badRequest,
  fromZodError,
  internalError,
  notFound,
  tooManyRequests,
  unauthorized,
} from "@/lib/api-response";
import { getOptionalUser } from "@/lib/auth/optional-user";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";
import {
  createPushSubscriptionSchema,
  deletePushSubscriptionSchema,
} from "@/lib/validations/notification";

// Mais tolerante que o login: re-subscribes legítimos podem acontecer em
// page reloads e em re-grants de permissão. 30 req/min/IP cobre uso normal
// e ainda bloqueia atacante tentando poluir a tabela.
const RATE_LIMIT = { windowMs: 60_000, max: 30 };

// Identidade: deviceId (anônimo, persistente em localStorage — alinhado a /api/reports)
// ou userId (admin via JWT). Pelo menos um precisa estar presente para que o
// dispatcher consiga depois removê-la em opt-out / 410 Gone.
function resolveIdentity(input: {
  deviceId?: string;
  userId: string | null;
}): { deviceId: string | null; userId: string | null } | null {
  const deviceId = input.deviceId ?? null;
  const userId = input.userId;
  if (!deviceId && !userId) return null;
  return { deviceId, userId };
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(`push-subscribe:${getClientIp(request)}`, RATE_LIMIT);
    if (!rate.allowed) {
      return tooManyRequests(
        "Muitas tentativas de inscrição. Tente novamente em instantes.",
        rate.retryAfterSeconds,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = createPushSubscriptionSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const user = await getOptionalUser(request);
    const identity = resolveIdentity({ deviceId: parsed.data.deviceId, userId: user?.sub ?? null });
    if (!identity) {
      return badRequest("Forneça deviceId ou autentique-se para inscrever-se em pushes");
    }

    const { subscription, latitude, longitude } = parsed.data;

    // UPSERT por endpoint (chave única do PushSubscription).
    // O cliente pode re-enviar a mesma subscription em reloads — atualizamos
    // posição e identidade em vez de duplicar linhas.
    await prisma.$executeRaw`
      INSERT INTO "push_subscriptions"
        (id, endpoint, p256dh, auth, "deviceId", "userId",
         latitude, longitude, location, "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()},
        ${subscription.endpoint},
        ${subscription.keys.p256dh},
        ${subscription.keys.auth},
        ${identity.deviceId},
        ${identity.userId},
        ${latitude}::float8,
        ${longitude}::float8,
        ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography,
        NOW(),
        NOW()
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh      = EXCLUDED.p256dh,
        auth        = EXCLUDED.auth,
        "deviceId"  = COALESCE(EXCLUDED."deviceId", "push_subscriptions"."deviceId"),
        "userId"    = COALESCE(EXCLUDED."userId",   "push_subscriptions"."userId"),
        latitude    = EXCLUDED.latitude,
        longitude   = EXCLUDED.longitude,
        location    = EXCLUDED.location,
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/notifications/subscribe]", err);
    return internalError();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rate = checkRateLimit(`push-unsubscribe:${getClientIp(request)}`, RATE_LIMIT);
    if (!rate.allowed) {
      return tooManyRequests(
        "Muitas tentativas. Tente novamente em instantes.",
        rate.retryAfterSeconds,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = deletePushSubscriptionSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const user = await getOptionalUser(request);
    const identity = resolveIdentity({ deviceId: parsed.data.deviceId, userId: user?.sub ?? null });
    if (!identity) {
      return unauthorized("Forneça deviceId ou autentique-se para cancelar inscrição");
    }

    // WHERE escopado: endpoint sozinho não basta — sem este filtro, vazamento
    // do endpoint (logs, error reports) permitiria que qualquer um derrubasse
    // a subscription alheia. Só apaga se o caller for dono (deviceId/userId).
    const deleted = await prisma.$executeRaw`
      DELETE FROM "push_subscriptions"
      WHERE endpoint = ${parsed.data.endpoint}
        AND (
          (${identity.deviceId}::text IS NOT NULL AND "deviceId" = ${identity.deviceId})
          OR
          (${identity.userId}::text IS NOT NULL AND "userId" = ${identity.userId})
        )
    `;

    if (deleted === 0) return notFound("Subscription não encontrada");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/notifications/subscribe]", err);
    return internalError();
  }
}

// Prisma + web-push exigem runtime Node, não edge.
export const runtime = "nodejs";
