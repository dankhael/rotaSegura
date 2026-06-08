import { NextRequest, NextResponse } from "next/server";

import { badRequest, fromZodError, internalError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { type RawDonationChannel, toDonationPoint } from "@/lib/donations/serialize";
import { createDonationChannelSchema, paginationSchema } from "@/lib/validations/donation";
import type { DonationPoint, PaginatedResponse } from "@/types/donation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM "donation_channels"
    `;
    const total = Number(countResult[0].total);

    const rows = await prisma.$queryRaw<RawDonationChannel[]>`
      SELECT id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
      FROM "donation_channels"
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const body: PaginatedResponse<DonationPoint> = {
      data: rows.map(toDonationPoint),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/donations]", err);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = createDonationChannelSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const { title, description, channelType, channelValue } = parsed.data;
    const id = crypto.randomUUID();
    const now = new Date();

    const rows = await prisma.$queryRaw<RawDonationChannel[]>`
      INSERT INTO "donation_channels" (
        id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${title}, ${description}, ${channelType}, ${channelValue}, ${now}, ${now}
      )
      RETURNING id, title, description, "channelType", "channelValue", "createdAt", "updatedAt"
    `;

    return NextResponse.json(toDonationPoint(rows[0]), { status: 201 });
  } catch (err) {
    console.error("[POST /api/donations]", err);
    return internalError();
  }
}
