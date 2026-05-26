import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      {
        error: "Latitude e longitude obrigatórias",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`,
      {
        headers: {
          "User-Agent": "RotaSegura/1.0 (contato@rotasegura.app)",
        },
      },
    );

    const data = await response.json();

    return NextResponse.json({
      address: data?.display_name ?? "Endereço não encontrado",
    });
  } catch {
    return NextResponse.json(
      {
        address: "Endereço não disponível",
      },
      { status: 500 },
    );
  }
}
