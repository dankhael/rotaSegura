import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  RealWebPushSender,
  type PushNotificationPayload,
  type WebPushSender,
} from "@/lib/notifications/web-push-client";
import type { Occurrence, OccurrenceType } from "@/types/occurrence";

type NearbySubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Mensagens humanizadas por tipo de ocorrência. Mantidas centralizadas para
// que a tradução AC-05 (título + descrição curta) seja consistente em qualquer
// canal futuro (ex: e-mail/SMS).
const TYPE_LABEL: Record<OccurrenceType, string> = {
  FLOOD: "Enchente",
  FIRE: "Incêndio",
  LANDSLIDE: "Deslizamento",
  ACCIDENT: "Acidente",
  OBSTRUCTION: "Obstrução de via",
  OTHER: "Risco reportado",
};

export type DispatchOptions = {
  /** Raio em km. Padrão = env.NOTIFICATION_RADIUS_KM. */
  radiusKm?: number;
  /** Substituível por uma fake nos testes. */
  sender?: WebPushSender;
  /** Permite injetar uma transaction client em testes/dispatcher inline. */
  db?: Prisma.TransactionClient | typeof prisma;
};

export type DispatchResult = {
  candidates: number;
  delivered: number;
  expiredRemoved: number;
};

/**
 * Notifica todos os dispositivos com PushSubscription cuja última posição
 * conhecida esteja dentro de `radiusKm` da ocorrência. Erros 404/410 do push
 * service derrubam a subscription do banco (AC-08). Nunca propaga exceções —
 * AC-09 exige que falha no envio não bloqueie a criação da ocorrência.
 */
export async function sendPushToNearbyUsers(
  occurrence: Occurrence,
  options: DispatchOptions = {},
): Promise<DispatchResult> {
  const radiusKm = options.radiusKm ?? env.NOTIFICATION_RADIUS_KM;
  const sender = options.sender ?? new RealWebPushSender();
  const db = options.db ?? prisma;

  try {
    const subs = await findNearbySubscriptions(db, occurrence, radiusKm);
    if (subs.length === 0) return { candidates: 0, delivered: 0, expiredRemoved: 0 };

    const payload = buildPayload(occurrence);
    const results = await Promise.allSettled(
      subs.map((s) =>
        sender.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload),
      ),
    );

    let delivered = 0;
    const expiredIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.ok) delivered += 1;
      if (r.status === "fulfilled" && !r.value.ok && r.value.expired) expiredIds.push(subs[i].id);
    });

    if (expiredIds.length > 0) await purgeExpired(db, expiredIds);

    return { candidates: subs.length, delivered, expiredRemoved: expiredIds.length };
  } catch (err) {
    console.error("[sendPushToNearbyUsers]", err);
    return { candidates: 0, delivered: 0, expiredRemoved: 0 };
  }
}

async function findNearbySubscriptions(
  db: Prisma.TransactionClient | typeof prisma,
  occurrence: Occurrence,
  radiusKm: number,
): Promise<NearbySubscriptionRow[]> {
  const radiusM = radiusKm * 1000;
  // ST_DWithin em geography aceita metros — alinhado com clusterReport (US06).
  return db.$queryRaw<NearbySubscriptionRow[]>`
    SELECT id, endpoint, p256dh, auth
    FROM "push_subscriptions"
    WHERE ST_DWithin(
      location,
      ST_SetSRID(
        ST_MakePoint(${occurrence.centroidLongitude}::float8, ${occurrence.centroidLatitude}::float8),
        4326
      )::geography,
      ${radiusM}::float8
    )
  `;
}

async function purgeExpired(
  db: Prisma.TransactionClient | typeof prisma,
  ids: string[],
): Promise<void> {
  await db.$executeRaw`
    DELETE FROM "push_subscriptions" WHERE id = ANY(${ids}::text[])
  `;
}

function buildPayload(occurrence: Occurrence): PushNotificationPayload {
  const label = TYPE_LABEL[occurrence.type] ?? "Risco reportado";
  const count = occurrence.uniqueDeviceCount;
  // O dispatch só roda em PENDING → CONFIRMED, então count >= threshold (US06).
  // Plural em PT-BR: "2 relatos" / "1 relato" (defensivo p/ singular se a regra mudar).
  const reportsPhrase = count === 1 ? "1 relato confirmou" : `${count} relatos confirmaram`;
  return {
    title: `⚠️ ${label} próxima`,
    body: `${reportsPhrase} ${label.toLowerCase()} perto de você. Toque para ver no mapa.`,
    occurrenceId: occurrence.id,
    lat: occurrence.centroidLatitude,
    lng: occurrence.centroidLongitude,
    url: "/",
  };
}
