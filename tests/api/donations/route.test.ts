/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { GET, POST } from "@/app/api/donations/route";
import { prisma } from "@/lib/db";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function createDonationViaApi(overrides: Record<string, unknown> = {}) {
  const payload = {
    title: "Campanha Abrigo Central",
    description: "Doações para compra de alimentos e itens de higiene.",
    channelType: "PIX_KEY",
    channelValue: "doacoes@rotasegura.org",
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/donations", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return POST(req);
}

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "donation_channels"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "donation_channels"`;
  await prisma.$disconnect();
});

describe("POST /api/donations", () => {
  it("persiste um canal PIX e retorna 201", async () => {
    const res = await createDonationViaApi();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeTruthy();
    expect(body.title).toBe("Campanha Abrigo Central");
    expect(body.channelType).toBe("PIX_KEY");
    expect(body.channelValue).toBe("doacoes@rotasegura.org");

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "donation_channels" WHERE id = ${body.id}
    `;
    expect(rows).toHaveLength(1);
  });

  it("aceita link externo com URL http/https", async () => {
    const res = await createDonationViaApi({
      channelType: "EXTERNAL_LINK",
      channelValue: "https://rotasegura.org/doar",
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.channelType).toBe("EXTERNAL_LINK");
  });

  it("retorna 400 para tipo inválido", async () => {
    const res = await createDonationViaApi({ channelType: "BOLETO" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelType" })]),
    );
  });

  it("retorna 400 para link externo sem URL válida", async () => {
    const res = await createDonationViaApi({
      channelType: "EXTERNAL_LINK",
      channelValue: "rotasegura.org/doar",
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelValue" })]),
    );
  });
});

describe("GET /api/donations", () => {
  it("lista canais criados com paginação", async () => {
    await createDonationViaApi({ title: "Canal A" });
    await createDonationViaApi({ title: "Canal B" });

    const req = makeRequest("http://localhost:3000/api/donations");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });
});
