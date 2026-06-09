/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { GET, POST } from "@/app/api/donations/route";
import { AUTH_COOKIE, signAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

async function withAdminCookie(request: NextRequest) {
  const token = await signAuthToken({
    sub: "1",
    email: "admin@rotasegura.local",
    role: "ADMIN",
  });
  request.cookies.set(AUTH_COOKIE, token);
  return request;
}

async function createDonationViaApi(overrides: Record<string, unknown> = {}) {
  const payload = {
    title: "Campanha Abrigo Central",
    description: "Doacoes para compra de alimentos e itens de higiene.",
    channelType: "PIX_KEY",
    channelValue: "doacoes@rotasegura.org",
    ...overrides,
  };

  const req = await withAdminCookie(
    makeRequest("http://localhost:3000/api/donations", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  );

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
  it("retorna 401 quando a requisicao nao e de admin", async () => {
    const req = makeRequest("http://localhost:3000/api/donations", {
      method: "POST",
      body: JSON.stringify({
        title: "Canal nao autorizado",
        description: "Tentativa sem credenciais de administrador.",
        channelType: "PIX_KEY",
        channelValue: "pix@atacante.test",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

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

  it("aceita QR Code com ate 271 bytes", async () => {
    const res = await createDonationViaApi({
      channelType: "QR_CODE",
      channelValue: "a".repeat(271),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.channelType).toBe("QR_CODE");
  });

  it("retorna 400 para QR Code acima de 271 bytes", async () => {
    const res = await createDonationViaApi({
      channelType: "QR_CODE",
      channelValue: "a".repeat(272),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelValue" })]),
    );
  });

  it("retorna 400 para tipo invalido", async () => {
    const res = await createDonationViaApi({ channelType: "BOLETO" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelType" })]),
    );
  });

  it("retorna 400 para link externo sem URL valida", async () => {
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
  it("lista canais criados com paginacao", async () => {
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
