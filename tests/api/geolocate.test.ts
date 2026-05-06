import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "@/app/api/geolocate/route";

function fakeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/geolocate", () => {
  it("queries the first provider with the public client IP from x-forwarded-for", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).toContain("8.8.8.8");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ip: "8.8.8.8",
            city: "Mountain View",
            country: "United States",
            latitude: "37.4",
            longitude: "-122.1",
          }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(fakeRequest({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      lat: 37.4,
      lng: -122.1,
      city: "Mountain View",
      country: "United States",
      source: "geojs",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("omits the IP segment when the client address is private (dev/loopback)", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).not.toMatch(/127\.0\.0\.1/);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ip: "1.2.3.4",
            city: "Server City",
            country: "Server Country",
            latitude: "10",
            longitude: "20",
          }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(fakeRequest({ "x-forwarded-for": "127.0.0.1" }));
    expect(res.status).toBe(200);
  });

  it("sends a non-default User-Agent so providers don't 403 generic fetch", async () => {
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.["User-Agent"]).toMatch(/rotaSegura/);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ip: "1.1.1.1",
            city: "X",
            country: "Y",
            latitude: "1",
            longitude: "2",
          }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(fakeRequest({ "x-forwarded-for": "1.1.1.1" }));
    expect(res.status).toBe(200);
  });

  it("falls back to the next provider when the first fails", async () => {
    const fetchSpy = vi.fn();
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => "" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ipAddress: "5.6.7.8",
            cityName: "Backup City",
            countryName: "Backup Country",
            latitude: 1.5,
            longitude: -2.5,
          }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(fakeRequest({ "x-forwarded-for": "5.6.7.8" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("freeipapi");
    expect(body.lat).toBe(1.5);
    expect(body.lng).toBe(-2.5);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns 502 with collected failure reasons when every provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "" })),
    );

    const res = await GET(fakeRequest({ "x-forwarded-for": "9.9.9.9" }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/All IP geolocation providers failed/);
    expect(body.failures).toHaveLength(3);
  });
});
