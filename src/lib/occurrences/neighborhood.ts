import { occurrenceRegion } from "@/lib/occurrences/region";

type Neighborhood = { name: string; latitude: number; longitude: number };

// Lista curada de bairros de Recife com centróides aproximados. Determinístico e
// offline — o modelo não guarda bairro (US06), então mapeamos o centróide da
// ocorrência ao bairro mais próximo (US10 v2). Trocar por reverse geocoding real
// exigiria rede + campo novo no schema.
const RECIFE_NEIGHBORHOODS: Neighborhood[] = [
  { name: "Recife Antigo", latitude: -8.063, longitude: -34.871 },
  { name: "Santo Antônio", latitude: -8.064, longitude: -34.878 },
  { name: "São José", latitude: -8.069, longitude: -34.879 },
  { name: "Boa Vista", latitude: -8.06, longitude: -34.889 },
  { name: "Soledade", latitude: -8.058, longitude: -34.892 },
  { name: "Santo Amaro", latitude: -8.045, longitude: -34.888 },
  { name: "Espinheiro", latitude: -8.04, longitude: -34.897 },
  { name: "Graças", latitude: -8.043, longitude: -34.901 },
  { name: "Aflitos", latitude: -8.038, longitude: -34.903 },
  { name: "Casa Forte", latitude: -8.035, longitude: -34.918 },
  { name: "Madalena", latitude: -8.052, longitude: -34.913 },
  { name: "Torre", latitude: -8.045, longitude: -34.917 },
  { name: "Zumbi", latitude: -8.052, longitude: -34.92 },
  { name: "Cordeiro", latitude: -8.055, longitude: -34.93 },
  { name: "Afogados", latitude: -8.073, longitude: -34.91 },
  { name: "Mustardinha", latitude: -8.08, longitude: -34.918 },
  { name: "Imbiribeira", latitude: -8.105, longitude: -34.915 },
  { name: "Boa Viagem", latitude: -8.118, longitude: -34.902 },
  { name: "Pina", latitude: -8.09, longitude: -34.885 },
  { name: "Ibura", latitude: -8.13, longitude: -34.935 },
  { name: "Jordão", latitude: -8.135, longitude: -34.945 },
  { name: "Tejipió", latitude: -8.095, longitude: -34.945 },
  { name: "Várzea", latitude: -8.045, longitude: -34.965 },
  { name: "Casa Amarela", latitude: -8.02, longitude: -34.915 },
  { name: "Macaxeira", latitude: -8.01, longitude: -34.935 },
];

// Além deste raio do bairro mais próximo, a ocorrência é tratada como fora da
// área coberta e cai no rótulo de grade.
const MAX_MATCH_KM = 6;

/**
 * Rotula uma ocorrência pelo bairro de Recife mais próximo do seu centróide.
 * Cai no rótulo de grade (`occurrenceRegion`) quando o ponto está longe de
 * qualquer bairro curado — pontos fora de Recife ainda recebem um rótulo.
 *
 * @example nearestNeighborhood(-8.073, -34.91) // "Afogados"
 */
export function nearestNeighborhood(latitude: number, longitude: number): string {
  let closest: Neighborhood | null = null;
  let closestKm = Infinity;

  for (const candidate of RECIFE_NEIGHBORHOODS) {
    const distanceKm = approxDistanceKm(
      latitude,
      longitude,
      candidate.latitude,
      candidate.longitude,
    );
    if (distanceKm < closestKm) {
      closestKm = distanceKm;
      closest = candidate;
    }
  }

  if (!closest || closestKm > MAX_MATCH_KM) {
    return occurrenceRegion(latitude, longitude);
  }
  return closest.name;
}

// Equiretangular: barato e preciso o bastante em escala de cidade (≤ dezenas de km).
function approxDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const kmPerDegree = 111.32;
  const meanLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const x = (lng2 - lng1) * Math.cos(meanLatRad) * kmPerDegree;
  const y = (lat2 - lat1) * kmPerDegree;
  return Math.sqrt(x * x + y * y);
}
