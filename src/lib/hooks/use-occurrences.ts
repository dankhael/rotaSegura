import { useMapResource } from "@/lib/hooks/use-map-resource";
import type { Occurrence } from "@/types/occurrence";

/**
 * Ocorrências agregadas (US06) para a camada de marcadores do mapa.
 * Ver [[use-map-resource]] para a semântica de validação/cancelamento/erro.
 *
 * @example
 *   const { occurrences, hasError } = useOccurrences();
 */
export function useOccurrences(limit = 100): { occurrences: Occurrence[]; hasError: boolean } {
  const { items, hasError } = useMapResource<Occurrence>(`/api/occurrences?limit=${limit}`);
  return { occurrences: items, hasError };
}
