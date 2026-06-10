import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const evaluationSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(280).optional(),
  deviceId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const validatedData = evaluationSchema.parse(body);

    const evaluation = await prisma.supportPointEvaluation.create({
      data: {
        rating: validatedData.rating,
        comment: validatedData.comment,
        deviceId: validatedData.deviceId,
        supportPointId: id,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno ao processar avaliação" },
      { status: 500 }
    );
  }
}
