import { describe, it, expect, vi, beforeEach } from "vitest";

const queryRawMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns ok + connected when SELECT 1 succeeds", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("connected");
    expect(typeof body.timestamp).toBe("string");
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it("returns ok + disconnected when DB query throws", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("disconnected");
  });
});
