/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { GET } from "@/app/api/geocode/route";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("GET /api/geocode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("geocodifica um local textual e retorna coordenadas", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          lat: "-8.1258",
          lon: "-34.9006",
          display_name: "Boa Viagem, Recife, Pernambuco",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest("http://localhost:3000/api/geocode?q=Boa%20Viagem"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/search?format=json"),
      expect.any(Object),
    );
    expect(body).toEqual({
      address: "Boa Viagem, Recife, Pernambuco",
      latitude: -8.1258,
      longitude: -34.9006,
    });
  });

  it("retorna 404 quando o local textual nao possui resultado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    const res = await GET(makeRequest("http://localhost:3000/api/geocode?q=Lugar%20inexistente"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Local nao encontrado");
  });
});
