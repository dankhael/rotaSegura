import { OCCURRENCE_TYPES } from "@/lib/occurrences/labels";
import { nearestNeighborhood } from "@/lib/occurrences/neighborhood";
import type { DashboardPeriod } from "@/lib/occurrences/period";
import { occurrenceSeverity, type OccurrenceSeverity } from "@/lib/occurrences/severity";
import {
  averageConfirmationMinutes,
  buildTimeSeries,
  computeTrend,
  toDate,
} from "@/lib/occurrences/summary-trends";
import type {
  MapPoint,
  OccurrenceStatusCounts,
  OccurrenceSummary,
  RecentOccurrence,
  RegionSummary,
  SeverityCounts,
  SummarizableOccurrence,
  TypeCount,
} from "@/types/occurrence-summary";

// Re-export para os route handlers tiparem as linhas do banco.
export type { SummarizableOccurrence } from "@/types/occurrence-summary";

const RECENT_LIMIT = 8;
const MAP_POINT_LIMIT = 300;

export interface SummaryWindow {
  current: SummarizableOccurrence[];
  previous: SummarizableOccurrence[];
  period: DashboardPeriod;
  start: Date;
  now: Date;
}

/**
 * Monta o resumo rico do dashboard (US10 v2) a partir das janelas atual e
 * anterior já filtradas (tipo/status/período). Como recebe o conjunto filtrado,
 * todos os agregados refletem os filtros. Delega série/tendência/média para
 * [[summary-trends]] e mantém cada tally pequeno.
 */
export function buildOccurrenceSummary(window: SummaryWindow): OccurrenceSummary {
  const { current, previous, period, start, now } = window;
  return {
    total: current.length,
    byStatus: tallyStatus(current),
    byType: tallyType(current),
    bySeverity: tallySeverity(current),
    regions: tallyRegions(current),
    timeSeries: buildTimeSeries(current, start, now),
    trend: computeTrend(current, previous),
    recent: pickRecent(current),
    avgConfirmationMinutes: averageConfirmationMinutes(current),
    mapPoints: pickMapPoints(current),
    period,
  };
}

function severityOf(row: SummarizableOccurrence): OccurrenceSeverity {
  return occurrenceSeverity({
    type: row.type,
    status: row.status,
    reportCount: row.reportCount,
    uniqueDeviceCount: row.uniqueDeviceCount,
  });
}

function tallyStatus(rows: SummarizableOccurrence[]): OccurrenceStatusCounts {
  const counts = { pending: 0, confirmed: 0 };
  for (const row of rows) {
    if (row.status === "CONFIRMED") counts.confirmed += 1;
    else counts.pending += 1;
  }
  return counts;
}

function tallyType(rows: SummarizableOccurrence[]): TypeCount[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.type, (totals.get(row.type) ?? 0) + 1);
  // Só tipos presentes; ordem por total desc (empate mantém a ordem do enum).
  return OCCURRENCE_TYPES.map((type) => ({ type, total: totals.get(type) ?? 0 }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
}

function tallySeverity(rows: SummarizableOccurrence[]): SeverityCounts {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    const severity = severityOf(row);
    if (severity === "HIGH") counts.high += 1;
    else if (severity === "MEDIUM") counts.medium += 1;
    else counts.low += 1;
  }
  return counts;
}

function tallyRegions(rows: SummarizableOccurrence[]): RegionSummary[] {
  const byName = new Map<string, RegionSummary>();
  for (const row of rows) {
    const region = nearestNeighborhood(row.centroidLatitude, row.centroidLongitude);
    const entry = byName.get(region) ?? { region, total: 0, pending: 0, confirmed: 0 };
    entry.total += 1;
    if (row.status === "CONFIRMED") entry.confirmed += 1;
    else entry.pending += 1;
    byName.set(region, entry);
  }
  return [...byName.values()].sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
}

function pickRecent(rows: SummarizableOccurrence[]): RecentOccurrence[] {
  return [...rows]
    .sort((a, b) => toDate(b.lastReportedAt).getTime() - toDate(a.lastReportedAt).getTime())
    .slice(0, RECENT_LIMIT)
    .map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      severity: severityOf(row),
      neighborhood: nearestNeighborhood(row.centroidLatitude, row.centroidLongitude),
      reportCount: row.reportCount,
      lastReportedAt: toDate(row.lastReportedAt).toISOString(),
    }));
}

function pickMapPoints(rows: SummarizableOccurrence[]): MapPoint[] {
  return rows.slice(0, MAP_POINT_LIMIT).map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    latitude: row.centroidLatitude,
    longitude: row.centroidLongitude,
    reportCount: row.reportCount,
    uniqueDeviceCount: row.uniqueDeviceCount,
    lastReportedAt: toDate(row.lastReportedAt).toISOString(),
  }));
}
