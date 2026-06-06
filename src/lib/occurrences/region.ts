// Tamanho da célula da grade geográfica usada para agrupar ocorrências por
// "região" no dashboard (US10). 0.05° ≈ 5,5 km no eixo da latitude.
export const REGION_GRID_DEGREES = 0.05;

/**
 * Deriva um rótulo de região a partir do centróide da ocorrência.
 *
 * O modelo (US06) só guarda lat/long do centróide — não há campo de
 * bairro/região. Para o dashboard agrupamos por célula de grade geográfica:
 * determinístico, sem dependência de geocoder externo (que seria limitado a
 * 1 req/s pelo Nominatim e não-testável). Trocar por bairro real exige reverse
 * geocoding e fica como evolução do US10.
 *
 * O rótulo usa o canto sudoeste da célula (múltiplo da grade), que é exato em
 * 2 casas decimais e único por célula.
 *
 * @example occurrenceRegion(-8.05, -34.9) // "8.05°S, 34.90°O"
 */
export function occurrenceRegion(latitude: number, longitude: number): string {
  const cellLatitude = gridFloor(latitude);
  const cellLongitude = gridFloor(longitude);
  return `${formatCoordinate(cellLatitude, "S", "N")}, ${formatCoordinate(cellLongitude, "O", "L")}`;
}

function gridFloor(value: number): number {
  return Math.floor(value / REGION_GRID_DEGREES) * REGION_GRID_DEGREES;
}

function formatCoordinate(
  value: number,
  negativeHemisphere: string,
  positiveHemisphere: string,
): string {
  const hemisphere = value < 0 ? negativeHemisphere : positiveHemisphere;
  return `${Math.abs(value).toFixed(2)}°${hemisphere}`;
}
