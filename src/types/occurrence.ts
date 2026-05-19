export type OccurrenceType = "FLOOD" | "FIRE" | "LANDSLIDE" | "ACCIDENT" | "OBSTRUCTION" | "OTHER";

export interface Occurrence {
  id: string;
  type: OccurrenceType;
  latitude: number;
  longitude: number;
  occurredAt: string;
  createdAt: string;
}
