import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { notFound, fromZodError, internalError } from "@/lib/api-response";

const evaluationSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(280).transform(v => v.trim() || undefined).optional(),
  deviceId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const point = await prisma.supportPoint.findUnique({ where: { id } });
    if (!point) return notFound("Ponto de apoio não encontrado");

    const body = await request.json();
    const validated = evaluationSchema.safeParse(body);
    if (!validated.success) return fromZodError(validated.error);

    const evaluation = await prisma.supportPointEvaluation.create({
      data: { ...validated.data, supportPointId: id },
    });

    return NextResponse.json(evaluation, { status: 201 });

  } catch (error) {
    const isPrismaConflict = 
      error && 
      typeof error === 'object' && 
      'code' in error && 
      error.code === 'P2002';

    if (isPrismaConflict) {
      return NextResponse.json(
        { error: "Você já avaliou este local" }, 
        { status: 409 }
      );
    }

    console.error("[EVALUATION_POST]", error);
    return internalError();
  }
}
