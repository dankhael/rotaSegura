import { occurrenceSeverity } from "@/lib/occurrences/severity";
import type {
  SummarizableOccurrence,
  TimeSeriesPoint,
  TrendDeltas,
} from "@/types/occurrence-summary";

const DAY_MS = 86_400_000;

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isHighSeverity(row: SummarizableOccurrence): boolean {
  return (
    occurrenceSeverity({
      type: row.type,
      status: row.status,
      reportCount: row.reportCount,
      uniqueDeviceCount: row.uniqueDeviceCount,
    }) === "HIGH"
  );
}

/**
 * Série diária pendentes/confirmadas/alta no período, com dias sem ocorrência
 * preenchidos com zero (para o gráfico de área não ter buracos). Agrupa pelo
 * `firstReportedAt` (quando a ocorrência começou), em dias UTC.
 */
export function buildTimeSeries(
  rows: SummarizableOccurrence[],
  start: Date,
  now: Date,
): TimeSeriesPoint[] {
  const buckets = emptyDailyBuckets(start, now);
  for (const row of rows) {
    const bucket = buckets.get(dayKey(toDate(row.firstReportedAt)));
    if (!bucket) continue; // fora da janela — defensivo
    if (row.status === "CONFIRMED") bucket.confirmed += 1;
    else bucket.pending += 1;
    if (isHighSeverity(row)) bucket.high += 1;
  }
  return [...buckets.values()];
}

function emptyDailyBuckets(start: Date, now: Date): Map<string, TimeSeriesPoint> {
  const buckets = new Map<string, TimeSeriesPoint>();
  const end = startOfUtcDay(now).getTime();
  for (let cursor = startOfUtcDay(start).getTime(); cursor <= end; cursor += DAY_MS) {
    const key = dayKey(new Date(cursor));
    buckets.set(key, { date: key, pending: 0, confirmed: 0, high: 0 });
  }
  return buckets;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Deltas da janela atual menos a anterior — base dos indicadores de tendência. */
export function computeTrend(
  current: SummarizableOccurrence[],
  previous: SummarizableOccurrence[],
): TrendDeltas {
  return {
    total: current.length - previous.length,
    pending: countStatus(current, "PENDING") - countStatus(previous, "PENDING"),
    confirmed: countStatus(current, "CONFIRMED") - countStatus(previous, "CONFIRMED"),
    high: current.filter(isHighSeverity).length - previous.filter(isHighSeverity).length,
  };
}

function countStatus(rows: SummarizableOccurrence[], status: "PENDING" | "CONFIRMED"): number {
  return rows.filter((row) => row.status === status).length;
}

/**
 * Tempo médio (min) entre o primeiro relato e a confirmação, sobre as
 * confirmadas. Substituto honesto do "tempo de resposta" do mockup, que não é
 * computável (não há timestamp de resolução). `null` quando não há confirmadas.
 */
export function averageConfirmationMinutes(rows: SummarizableOccurrence[]): number | null {
  const durationsMs = rows
    .filter((row) => row.status === "CONFIRMED" && row.confirmedAt)
    .map(
      (row) =>
        toDate(row.confirmedAt as Date | string).getTime() - toDate(row.firstReportedAt).getTime(),
    )
    .filter((ms) => ms >= 0);

  if (durationsMs.length === 0) return null;
  const averageMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
  return Math.round(averageMs / 60_000);
}
