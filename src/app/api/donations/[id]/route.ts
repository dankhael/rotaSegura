import { NextRequest, NextResponse } from "next/server";

import { badRequest, fromZodError, internalError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { type RawDonationChannel, toDonationPoint } from "@/lib/donations/serialize";
import { updateDonationChannelSchema } from "@/lib/validations/donation";

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

    const { title, description, channelType, channelValue } = parsed.data;
    const now = new Date();

    const rows = await prisma.$queryRaw<RawDonationChannel[]>`
      UPDATE "donation_channels"
      SET
        title = COALESCE(${title ?? null}, title),
        description = COALESCE(${description ?? null}, description),
        "channelType" = COALESCE(${channelType ?? null}, "channelType"),
        "channelValue" = COALESCE(${channelValue ?? null}, "channelValue"),
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
