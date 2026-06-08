import type { OccurrenceStatus, OccurrenceType } from "@/types/occurrence";
import type { OccurrenceSeverity } from "@/lib/occurrences/severity";

// Rótulos pt-BR compartilhados entre o mapa (US06) e o dashboard admin (US10).
// Centralizado para que mapa, legenda e filtros nunca divirjam ao renomear um tipo.
export const OCCURRENCE_TYPE_LABEL: Record<OccurrenceType, string> = {
  FLOOD: "Alagamento",
  FIRE: "Incêndio",
  LANDSLIDE: "Deslizamento",
  ACCIDENT: "Acidente",
  OBSTRUCTION: "Obstrução",
  OTHER: "Outro",
};

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
};

// Ordem de exibição em filtros e legendas — espelha o enum em validations/occurrence.ts.
export const OCCURRENCE_TYPES: OccurrenceType[] = [
  "FLOOD",
  "FIRE",
  "LANDSLIDE",
  "ACCIDENT",
  "OBSTRUCTION",
  "OTHER",
];

export const OCCURRENCE_STATUSES: OccurrenceStatus[] = ["PENDING", "CONFIRMED"];

export const SEVERITY_LABEL: Record<OccurrenceSeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

// Trio de tokens (fundo/borda/texto) para selos coloridos sem depender só da cor.
export type Tone = { background: string; border: string; ink: string };

export const SEVERITY_TONE: Record<OccurrenceSeverity, Tone> = {
  HIGH: {
    background: "var(--emergency-soft)",
    border: "var(--emergency)",
    ink: "var(--emergency-ink)",
  },
  MEDIUM: { background: "var(--warn-soft)", border: "var(--warn)", ink: "var(--warn-ink)" },
  LOW: { background: "var(--surface-2)", border: "var(--line)", ink: "var(--ink-3)" },
};

export const STATUS_TONE: Record<OccurrenceStatus, Tone> = {
  PENDING: { background: "var(--warn-soft)", border: "var(--warn)", ink: "var(--warn-ink)" },
  CONFIRMED: { background: "var(--safe-soft)", border: "var(--safe)", ink: "var(--safe-ink)" },
};
