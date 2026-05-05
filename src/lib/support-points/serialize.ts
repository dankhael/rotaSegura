import type { SupportPoint } from "@/types/support-point";

export type RawSupportPoint = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toSupportPoint(row: RawSupportPoint): SupportPoint {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SupportPoint["type"],
    capacity: row.capacity,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
