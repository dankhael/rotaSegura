import type { OccurrenceStatus, OccurrenceType } from "@/types/occurrence";

export type OccurrenceSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface SeverityInput {
  type: OccurrenceType;
  status: OccurrenceStatus;
  reportCount: number;
  uniqueDeviceCount: number;
}

// Risco intrínseco por tipo: FIRE/LANDSLIDE ameaçam vida diretamente;
// FLOOD/ACCIDENT são intermediários; OBSTRUCTION/OTHER são os mais brandos.
const TYPE_RISK: Record<OccurrenceType, number> = {
  FIRE: 2,
  LANDSLIDE: 2,
  FLOOD: 1,
  ACCIDENT: 1,
  OBSTRUCTION: 0,
  OTHER: 0,
};

/**
 * Deriva a gravidade da ocorrência (US10 v2). NÃO existe campo de severidade no
 * modelo — esta é uma heurística determinística até existir um campo real:
 * risco do tipo + corroboração (confirmação e volume de relatos/dispositivos).
 * Constantes acima e abaixo são os pontos de ajuste.
 *
 * @example occurrenceSeverity({ type: "FIRE", status: "CONFIRMED", reportCount: 4, uniqueDeviceCount: 3 }) // "HIGH"
 */
export function occurrenceSeverity(input: SeverityInput): OccurrenceSeverity {
  const score = TYPE_RISK[input.type] + corroborationBoost(input);
  if (score >= 3) return "HIGH";
  if (score >= 1) return "MEDIUM";
  return "LOW";
}

function corroborationBoost(input: SeverityInput): number {
  let boost = 0;
  if (input.status === "CONFIRMED") boost += 1;
  if (input.reportCount >= 5 || input.uniqueDeviceCount >= 4) boost += 1;
  return boost;
}
