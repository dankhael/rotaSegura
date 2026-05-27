export type OccurrenceType = "FLOOD" | "FIRE" | "LANDSLIDE" | "ACCIDENT" | "OBSTRUCTION" | "OTHER";

export type OccurrenceStatus = "PENDING" | "CONFIRMED";

// Agregado de relatos próximos (US06). Centróide é recalculado a cada novo report.
export interface Occurrence {
  id: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  centroidLatitude: number;
  centroidLongitude: number;
  reportCount: number;
  uniqueDeviceCount: number;
  firstReportedAt: string;
  lastReportedAt: string;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
