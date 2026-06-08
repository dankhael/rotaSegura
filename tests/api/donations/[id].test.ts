/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { NextRequest as NextRequestType } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/donations/[id]/route";
import { POST } from "@/app/api/donations/route";
import { prisma } from "@/lib/db";

type NextRequestInit = ConstructorParameters<typeof NextRequestType>[1];

function makeRequest(url: string, options?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedDonation(overrides: Record<string, unknown> = {}) {
  const payload = {
    title: "Campanha Abrigo Central",
    description: "Doações para compra de alimentos.",
    channelType: "PIX_KEY",
    channelValue: "doacoes@rotasegura.org",
    ...overrides,
  };

  const req = makeRequest("http://localhost:3000/api/donations", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

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
  it("atualiza título e canal", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Campanha Atualizada",
        channelValue: "novo@rotasegura.org",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe("Campanha Atualizada");
    expect(body.channelValue).toBe("novo@rotasegura.org");
  });

  it("retorna 400 quando body está vazio", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, makeCtx(created.id));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/donations/:id", () => {
  it("remove o canal e retorna 204", async () => {
    const created = await seedDonation();

    const req = makeRequest(`http://localhost:3000/api/donations/${created.id}`, {
      method: "DELETE",
    });

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

    const req = makeRequest(`http://localhost:3000/api/donations/${first.id}`, {
      method: "DELETE",
    });
    await DELETE(req, makeCtx(first.id));

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "donation_channels" WHERE id = ${second.id}
    `;
    expect(rows).toHaveLength(1);
  });
});
