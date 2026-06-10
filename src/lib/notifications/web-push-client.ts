import webpush from "web-push";

import { env } from "@/lib/env";

// Wrap fino sobre `web-push` (CLAUDE.md §"Dependencies") para isolar o resto
// do código do SDK e facilitar testes. O setVapidDetails só roda uma vez,
// quando as três variáveis estão presentes.

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  occurrenceId?: string;
  lat?: number;
  lng?: number;
  url?: string;
};

export type WebPushDeliveryResult =
  | { ok: true }
  | { ok: false; statusCode: number | null; expired: boolean };

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface WebPushSender {
  send(
    subscription: PushSubscriptionPayload,
    payload: PushNotificationPayload,
  ): Promise<WebPushDeliveryResult>;
}

export class RealWebPushSender implements WebPushSender {
  async send(
    subscription: PushSubscriptionPayload,
    payload: PushNotificationPayload,
  ): Promise<WebPushDeliveryResult> {
    if (!ensureConfigured()) {
      // VAPID ausente: degrada silenciosamente em vez de derrubar o request
      // do caller. Em dev/test isso é o esperado quando .env não tem as chaves.
      return { ok: false, statusCode: null, expired: false };
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { ok: true };
    } catch (err) {
      const statusCode = extractStatusCode(err);
      // 404 Not Found / 410 Gone do push service → endpoint morreu, pode purgar.
      const expired = statusCode === 404 || statusCode === 410;
      return { ok: false, statusCode, expired };
    }
  }
}

function extractStatusCode(err: unknown): number | null {
  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const code = (err as { statusCode: unknown }).statusCode;
    if (typeof code === "number") return code;
  }
  return null;
}
