import type { LucideIcon } from "lucide-react";
import { Car, Construction, Droplet, Flame, Mountain, MoreHorizontal } from "lucide-react";

import type { OccurrenceType } from "@/types/occurrence";

// Ícone lucide por tipo de ocorrência (escopo do dashboard admin). Separado de
// type-visuals.ts (cores) para não arrastar lucide para o bundle do mapa público.
export const OCCURRENCE_TYPE_ICON: Record<OccurrenceType, LucideIcon> = {
  FLOOD: Droplet,
  FIRE: Flame,
  LANDSLIDE: Mountain,
  ACCIDENT: Car,
  OBSTRUCTION: Construction,
  OTHER: MoreHorizontal,
};
