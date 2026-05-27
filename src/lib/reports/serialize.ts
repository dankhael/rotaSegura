import type { Report, ReportType } from "@/types/report";

export type RawReport = {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  createdAt: Date;
  deviceId: string | null;
  occurrenceId: string;
};

export function toReport(row: RawReport): Report {
  return {
    id: row.id,
    type: row.type as ReportType,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    deviceId: row.deviceId,
    occurrenceId: row.occurrenceId,
  };
}

export const REPORT_SELECT_COLUMNS = `
  id, type, latitude, longitude,
  "occurredAt", "createdAt",
  "deviceId", "occurrenceId"
`;
