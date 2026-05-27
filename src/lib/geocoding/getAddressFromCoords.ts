import { apiEndpoints } from "@/lib/api/endpoints";

// Cache em memória por coordenada arredondada (3 casas ≈ 110m). O GPS em mobile
// refina a posição várias vezes, e o Nominatim limita 1 req/s sustentado — sem
// cache, um único modal aberto dispararia várias chamadas idênticas (ver PR #8).
const addressCache = new Map<string, string>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function getAddressFromCoords(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string> {
  const key = cacheKey(lat, lng);
  const cached = addressCache.get(key);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${apiEndpoints.geocode}?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { signal },
    );

    if (!response.ok) {
      return "Endereço não disponível";
    }

    const data = await response.json();
    const address = data.address ?? "Endereço não encontrado";
    addressCache.set(key, address);
    return address;
  } catch {
    return "Endereço não disponível";
  }
}
