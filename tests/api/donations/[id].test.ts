/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/donations/[id]/route";
import { POST } from "@/app/api/donations/route";
import { AUTH_COOKIE, signAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
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

async function seedDonation(overrides: Record<string, unknown> = {}) {
  const payload = {
    title: "Campanha Abrigo Central",
    description: "Doações para compra de alimentos.",
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

  const res = await POST(req);
  return res.json() as Promise<{ id: string; [key: string]: unknown }>;
}

beforeEach(async () => {
  await prisma.$executeRaw`DELETE FROM "donation_channels"`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "donation_channels"`;
  await prisma.$disconnect();
});

describe("GET /api/donations/:id", () => {
  it("retorna 200 com o canal correto", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`);
    const res = await GET(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(created.id);
    expect(body.title).toBe("Campanha Abrigo Central");
  });

  it("retorna 404 quando canal não existe", async () => {
    const req = makeRequest("http://localhost:3000/api/donations/id-inexistente");
    const res = await GET(req, makeCtx("id-inexistente"));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/donations/:id", () => {
  it("retorna 401 quando a requisicao nao e de admin", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Tentativa sem admin" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));

    expect(res.status).toBe(401);
  });

  it("atualiza título e canal", async () => {
    const created = await seedDonation();

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: "Campanha Atualizada",
          channelValue: "novo@rotasegura.org",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe("Campanha Atualizada");
    expect(body.channelValue).toBe("novo@rotasegura.org");
  });

  it("rejeita channelValue invalido quando o registro final continua link externo", async () => {
    const created = await seedDonation({
      channelType: "EXTERNAL_LINK",
      channelValue: "https://rotasegura.org/doar",
    });

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ channelValue: "javascript:alert(1)" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelValue" })]),
    );

    const rows = await prisma.$queryRaw<{ channelValue: string }[]>`
      SELECT "channelValue" FROM "donation_channels" WHERE id = ${created.id}
    `;
    expect(rows[0].channelValue).toBe("https://rotasegura.org/doar");
  });

  it("rejeita mudar para QR Code quando o valor final e longo demais", async () => {
    const longValue = "a".repeat(300);
    const created = await seedDonation({
      channelType: "PIX_KEY",
      channelValue: longValue,
    });

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ channelType: "QR_CODE" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "channelValue" })]),
    );

    const rows = await prisma.$queryRaw<{ channelType: string }[]>`
      SELECT "channelType" FROM "donation_channels" WHERE id = ${created.id}
    `;
    expect(rows[0].channelType).toBe("PIX_KEY");
  });

  it("retorna 400 quando body está vazio", async () => {
    const created = await seedDonation();

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/donations/:id", () => {
  it("retorna 401 quando a requisicao nao e de admin", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, makeCtx(created.id));

    expect(res.status).toBe(401);
  });

  it("remove o canal e retorna 204", async () => {
    const created = await seedDonation();

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
        method: "DELETE",
      }),
    );

    const res = await DELETE(req, makeCtx(created.id));
    expect(res.status).toBe(204);

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "donation_channels" WHERE id = ${created.id}
    `;
    expect(rows).toHaveLength(0);
  });

  it("não afeta outros canais ao remover um específico", async () => {
    const first = await seedDonation({ title: "Canal A" });
    const second = await seedDonation({ title: "Canal B" });

    const req = await withAdminCookie(
      makeRequest(`http://localhost:3000/api/donations/${first.id}`, {
        method: "DELETE",
      }),
    );
    await DELETE(req, makeCtx(first.id));

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "donation_channels" WHERE id = ${second.id}
    `;
    expect(rows).toHaveLength(1);
  });
});
