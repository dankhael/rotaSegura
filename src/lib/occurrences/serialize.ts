import type { Occurrence } from "@/types/occurrence";

export type RawOccurrence = {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  createdAt: Date;
};

export function toOccurrence(row: RawOccurrence): Occurrence {
  return {
    id: row.id,
    type: row.type as Occurrence["type"],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
