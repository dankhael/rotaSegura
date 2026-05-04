// src/app/api/support-points/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { badRequest, fromZodError, internalError, notFound } from "@/lib/api-response";
import { updateSupportPointSchema } from "@/lib/validations/support-point";
import type { SupportPoint } from "@/types/support-point";

// Tipo interno para mapear o retorno do SQL bruto
type RawSupportPoint = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Converte o registro do banco para o contrato da API.
 * Adicionado um check de segurança para evitar erro de 'properties of undefined'.
 */
function toSupportPoint(row: RawSupportPoint): SupportPoint {
  if (!row) return {} as SupportPoint;

  return {
    id: row.id,
    name: row.name,
    type: row.type as SupportPoint["type"],
    capacity: row.capacity,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── GET /api/support-points/:id ──────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Corrigido: Nome da tabela para "support_points"
    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      SELECT 
        id, name, type, capacity, 
        latitude, longitude, 
        "createdAt", "updatedAt"
      FROM "support_points" 
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    return NextResponse.json(toSupportPoint(rows[0]));
  } catch (err) {
    console.error("[GET /api/support-points/:id]", err);
    return internalError();
  }
}

// ─── PATCH /api/support-points/:id ─────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Body deve ser um JSON válido");
    }

    const parsed = updateSupportPointSchema.safeParse(body);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    // Validação: Exige ao menos um campo para atualização
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nenhum campo válido para atualizar");
    }

    const { name, type, latitude, longitude, capacity } = parsed.data;
    const now = new Date();

    // Corrigido: Atualização na tabela "support_points"
    // A lógica de COALESCE mantém o valor atual se o parâmetro for nulo/undefined
    const affectedRows = await prisma.$executeRaw`
      UPDATE "support_points"
      SET 
        name = COALESCE(${name ?? null}, name),
        type = COALESCE(${type ?? null}, type),
        capacity = CASE 
          WHEN ${capacity === null} THEN NULL 
          ELSE COALESCE(${capacity ?? null}, capacity) 
        END,
        latitude = COALESCE(${latitude ?? null}, latitude),
        longitude = COALESCE(${longitude ?? null}, longitude),
        location = CASE 
          WHEN ${longitude}::float8 IS NOT NULL AND ${latitude}::float8 IS NOT NULL 
          THEN ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography
          ELSE location 
        END,
        "updatedAt" = ${now}
      WHERE id = ${id}
    `;

    if (affectedRows === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    // Busca o registro atualizado para retorno
    const rows = await prisma.$queryRaw<RawSupportPoint[]>`
      SELECT id, name, type, capacity, latitude, longitude, "createdAt", "updatedAt"
      FROM "support_points" WHERE id = ${id}
    `;

    return NextResponse.json(toSupportPoint(rows[0]));
  } catch (err) {
    console.error("[PATCH /api/support-points/:id]", err);
    return internalError();
  }
}

// ─── DELETE /api/support-points/:id ────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Corrigido: Deleção na tabela "support_points"
    const result = await prisma.$executeRaw`
      DELETE FROM "support_points" WHERE id = ${id}
    `;

    // O $executeRaw retorna o número de linhas afetadas
    if (result === 0) {
      return notFound("Ponto de apoio não encontrado");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/support-points/:id]", err);
    return internalError();
  }
}
