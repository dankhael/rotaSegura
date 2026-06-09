import { NextRequest, NextResponse } from "next/server";

import {
  badRequest,
  fromZodError,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import { isAdminRequest } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db";
import { type RawDonationChannel, toDonationPoint } from "@/lib/donations/serialize";
import {
  createDonationChannelSchema,
  updateDonationChannelSchema,
} from "@/lib/validations/donation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRaw<RawDonationChannel[]>`
      SELECT id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
      FROM "donation_channels"
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound("Canal de doação não encontrado");
    }

    return NextResponse.json(toDonationPoint(rows[0]));
  } catch (err) {
    console.error("[GET /api/donations/:id]", err);
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdminRequest(request))) {
      return unauthorized("Acesso restrito a administradores");
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = updateDonationChannelSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nenhum campo válido para atualizar");
    }

    const currentRows = await prisma.$queryRaw<RawDonationChannel[]>`
      SELECT id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
      FROM "donation_channels"
      WHERE id = ${id}
    `;

    if (currentRows.length === 0) {
      return notFound("Canal de doaÃ§Ã£o nÃ£o encontrado");
    }

    const current = toDonationPoint(currentRows[0]);
    const next = createDonationChannelSchema.safeParse({
      title: parsed.data.title ?? current.title,
      description: parsed.data.description ?? current.description,
      channelType: parsed.data.channelType ?? current.channelType,
      channelValue: parsed.data.channelValue ?? current.channelValue,
    });

    if (!next.success) {
      return fromZodError(next.error);
    }

    const { title, description, channelType, channelValue } = next.data;
    const now = new Date();

    const rows = await prisma.$queryRaw<RawDonationChannel[]>`
      UPDATE "donation_channels"
      SET
        title = ${title},
        description = ${description},
        "channelType" = ${channelType},
        "channelValue" = ${channelValue},
        "updatedAt" = ${now}
      WHERE id = ${id}
      RETURNING id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
    `;

    if (rows.length === 0) {
      return notFound("Canal de doação não encontrado");
    }

    return NextResponse.json(toDonationPoint(rows[0]));
  } catch (err) {
    console.error("[PATCH /api/donations/:id]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAdminRequest(request))) {
      return unauthorized("Acesso restrito a administradores");
    }

    const { id } = await params;

    const result = await prisma.$executeRaw`
      DELETE FROM "donation_channels" WHERE id = ${id}
    `;

    if (result === 0) {
      return notFound("Canal de doação não encontrado");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/donations/:id]", err);
    return internalError();
  }
}
