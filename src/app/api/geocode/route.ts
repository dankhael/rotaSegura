import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_HEADERS = {
  "User-Agent": "RotaSegura/1.0 (contato@rotasegura.app)",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (q) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=pt-BR&countrycodes=br`,
        {
          headers: NOMINATIM_HEADERS,
        },
      );

      const data = await response.json();
      const result = Array.isArray(data) ? data[0] : null;
      const latitude = Number(result?.lat);
      const longitude = Number(result?.lon);

      if (!result || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "Local nao encontrado" }, { status: 404 });
      }

      return NextResponse.json({
        address: result.display_name ?? q,
        latitude,
        longitude,
      });
    } catch {
      return NextResponse.json({ error: "Busca indisponivel" }, { status: 500 });
    }
  }

  if (!lat || !lng) {
    return NextResponse.json(
      {
        error: "Latitude e longitude obrigatorias",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`,
      {
        headers: NOMINATIM_HEADERS,
      },
    );

    const data = await response.json();

    return NextResponse.json({
      address: data?.display_name ?? "Endereco nao encontrado",
    });
  } catch {
    return NextResponse.json(
      {
        address: "Endereco nao disponivel",
      },
      { status: 500 },
    );
  }
}
