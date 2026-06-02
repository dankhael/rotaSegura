import { useMapResource } from "@/lib/hooks/use-map-resource";
import type { SupportPoint } from "@/types/support-point";

/**
 * Pontos de apoio (abrigos, atendimento médico, suprimentos) para a camada de
 * marcadores do mapa. Ver [[use-map-resource]] para a semântica compartilhada.
 *
 * @example
 *   const { supportPoints, hasError } = useSupportPoints();
 */
export function useSupportPoints(limit = 100): {
  supportPoints: SupportPoint[];
  hasError: boolean;
} {
  const { items, hasError } = useMapResource<SupportPoint>(`/api/support-points?limit=${limit}`);
  return { supportPoints: items, hasError };
}
