import type { OccurrenceType } from "@/types/occurrence";

export type ReportType = OccurrenceType;

export interface Report {
  id: string;
  type: ReportType;
  latitude: number;
  longitude: number;
  occurredAt: string;
  createdAt: string;
  deviceId: string | null;
  occurrenceId: string;
}
