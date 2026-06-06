import type { DashboardPeriod } from "@/lib/occurrences/period";
import type { OccurrenceSeverity } from "@/lib/occurrences/severity";
import type { OccurrenceStatus, OccurrenceType } from "@/types/occurrence";

// Linha de ocorrência consumida pelo builder do resumo (campos vindos do banco).
// Datas chegam como Date (prisma) ou string (testes) — o builder normaliza.
export interface SummarizableOccurrence {
  id: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  centroidLatitude: number;
  centroidLongitude: number;
  reportCount: number;
  uniqueDeviceCount: number;
  firstReportedAt: Date | string;
  lastReportedAt: Date | string;
  confirmedAt: Date | string | null;
}

export interface RegionSummary {
  region: string;
  total: number;
  pending: number;
  confirmed: number;
}

export interface OccurrenceStatusCounts {
  pending: number;
  confirmed: number;
}

export interface TypeCount {
  type: OccurrenceType;
  total: number;
}

export interface SeverityCounts {
  high: number;
  medium: number;
  low: number;
}

// Ponto diário da série temporal (data em YYYY-MM-DD, UTC).
export interface TimeSeriesPoint {
  date: string;
  pending: number;
  confirmed: number;
  high: number;
}

// Deltas da janela atual menos a anterior (tendência "vs período anterior").
export interface TrendDeltas {
  total: number;
  pending: number;
  confirmed: number;
  high: number;
}

export interface RecentOccurrence {
  id: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  severity: OccurrenceSeverity;
  neighborhood: string;
  reportCount: number;
  lastReportedAt: string;
}

// Mínimo necessário para os marcadores do mapa do dashboard (inclui
// uniqueDeviceCount para a gravidade derivada no popup sair correta).
export interface MapPoint {
  id: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  latitude: number;
  longitude: number;
  reportCount: number;
  uniqueDeviceCount: number;
  lastReportedAt: string;
}

// Resumo rico consumido pelo dashboard admin (US10 v2): tudo já refletindo os
// filtros de tipo/status/período aplicados no servidor.
export interface OccurrenceSummary {
  total: number;
  byStatus: OccurrenceStatusCounts;
  byType: TypeCount[];
  bySeverity: SeverityCounts;
  regions: RegionSummary[];
  timeSeries: TimeSeriesPoint[];
  trend: TrendDeltas;
  recent: RecentOccurrence[];
  avgConfirmationMinutes: number | null;
  mapPoints: MapPoint[];
  period: DashboardPeriod;
}

export interface OccurrenceSummaryFilters {
  type?: OccurrenceType;
  status?: OccurrenceStatus;
  period?: DashboardPeriod;
}
