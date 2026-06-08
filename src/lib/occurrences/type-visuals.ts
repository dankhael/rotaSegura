import type { OccurrenceType } from "@/types/occurrence";

// Cor por categoria de ocorrência. Fonte única reusada por mapa, cards, barras
// e lista — movido de occurrence-layer.tsx para evitar divergência (US10 v2).
// Mantido sem dependência de UI (sem lucide) para não inchar o bundle do mapa
// público; os ícones ficam em components/admin/dashboard/type-icons.ts.
export const OCCURRENCE_TYPE_COLOR: Record<OccurrenceType, string> = {
  FLOOD: "#2563eb",
  FIRE: "#dc2626",
  LANDSLIDE: "#a16207",
  ACCIDENT: "#7c3aed",
  OBSTRUCTION: "#ea580c",
  OTHER: "#6b7280",
};
