/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";

const queryRawMock = vi.fn();
const executeRawMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
  },
}));

import { sendPushToNearbyUsers } from "@/lib/notifications/dispatch";
import type {
  PushNotificationPayload,
  PushSubscriptionPayload,
  WebPushDeliveryResult,
  WebPushSender,
} from "@/lib/notifications/web-push-client";
import type { Occurrence } from "@/types/occurrence";

// Fake nomeado (CLAUDE.md §"Tests" — sem inline stubs).
class FakeSender implements WebPushSender {
  public calls: { sub: PushSubscriptionPayload; payload: PushNotificationPayload }[] = [];
  constructor(private results: WebPushDeliveryResult[]) {}
  async send(
    sub: PushSubscriptionPayload,
    payload: PushNotificationPayload,
  ): Promise<WebPushDeliveryResult> {
    this.calls.push({ sub, payload });
    return this.results.shift() ?? { ok: true };
  }
}

function occ(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: "occ-1",
    type: "FLOOD",
    status: "PENDING",
    centroidLatitude: -19.92,
    centroidLongitude: -43.93,
    reportCount: 1,
    uniqueDeviceCount: 1,
    firstReportedAt: new Date().toISOString(),
    lastReportedAt: new Date().toISOString(),
    confirmedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  queryRawMock.mockReset();
  executeRawMock.mockReset();
});

describe("sendPushToNearbyUsers", () => {
  it("envia uma notificação para cada inscrição dentro do raio (AC-04)", async () => {
    queryRawMock.mockResolvedValueOnce([
      { id: "s1", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
      { id: "s2", endpoint: "https://push.example/2", p256dh: "p2", auth: "a2" },
    ]);
    const sender = new FakeSender([{ ok: true }, { ok: true }]);

    const result = await sendPushToNearbyUsers(occ(), { radiusKm: 2, sender });

    expect(result).toEqual({ candidates: 2, delivered: 2, expiredRemoved: 0 });
    expect(sender.calls).toHaveLength(2);
    expect(sender.calls[0].payload.occurrenceId).toBe("occ-1");
    expect(sender.calls[0].payload.title).toContain("Enchente");
  });

  it("retorna 0 candidatos quando ninguém está dentro do raio (AC-09)", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const sender = new FakeSender([]);

    const result = await sendPushToNearbyUsers(occ(), { radiusKm: 2, sender });

    expect(result).toEqual({ candidates: 0, delivered: 0, expiredRemoved: 0 });
    expect(sender.calls).toHaveLength(0);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("remove subscriptions expiradas (410/404) do banco (AC-08)", async () => {
    queryRawMock.mockResolvedValueOnce([
      { id: "alive", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
      { id: "gone", endpoint: "https://push.example/2", p256dh: "p2", auth: "a2" },
    ]);
    executeRawMock.mockResolvedValue(1);
    const sender = new FakeSender([{ ok: true }, { ok: false, statusCode: 410, expired: true }]);

    const result = await sendPushToNearbyUsers(occ(), { radiusKm: 2, sender });

    expect(result.delivered).toBe(1);
    expect(result.expiredRemoved).toBe(1);
    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("não propaga exceções para o caller (AC-09)", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("db down"));
    const sender = new FakeSender([]);

    const result = await sendPushToNearbyUsers(occ(), { sender });

    expect(result).toEqual({ candidates: 0, delivered: 0, expiredRemoved: 0 });
  });

  it("rotula o título conforme o tipo da ocorrência (AC-05)", async () => {
    queryRawMock.mockResolvedValueOnce([{ id: "s1", endpoint: "e1", p256dh: "p1", auth: "a1" }]);
    const sender = new FakeSender([{ ok: true }]);

    await sendPushToNearbyUsers(occ({ type: "FIRE" }), { sender });

    expect(sender.calls[0].payload.title).toContain("Incêndio");
  });
});
