import type { Occurrence, OccurrenceStatus, OccurrenceType } from "@/types/occurrence";

export type RawOccurrence = {
  id: string;
  type: string;
  status: OccurrenceStatus;
  centroidLatitude: number;
  centroidLongitude: number;
  reportCount: number;
  uniqueDeviceCount: number;
  firstReportedAt: Date;
  lastReportedAt: Date;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toOccurrence(row: RawOccurrence): Occurrence {
  return {
    id: row.id,
    type: row.type as OccurrenceType,
    status: row.status,
    centroidLatitude: Number(row.centroidLatitude),
    centroidLongitude: Number(row.centroidLongitude),
    reportCount: Number(row.reportCount),
    uniqueDeviceCount: Number(row.uniqueDeviceCount),
    firstReportedAt: row.firstReportedAt.toISOString(),
    lastReportedAt: row.lastReportedAt.toISOString(),
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Lista de colunas explícita para queries raw — mantém serialização consistente.
export const OCCURRENCE_SELECT_COLUMNS = `
  id, type, status,
  "centroidLatitude", "centroidLongitude",
  "reportCount", "uniqueDeviceCount",
  "firstReportedAt", "lastReportedAt", "confirmedAt",
  "createdAt", "updatedAt"
`;
