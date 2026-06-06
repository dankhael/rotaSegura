"use client";

import { useState } from "react";

import { useOccurrenceSummary, type SummaryState } from "@/lib/hooks/use-occurrence-summary";
import type { OccurrenceType } from "@/types/occurrence";
import type { OccurrenceSummary, OccurrenceSummaryFilters } from "@/types/occurrence-summary";

import { DashboardMap } from "./dashboard-map";
import { DashboardToolbar } from "./dashboard-toolbar";
import { DashboardEmpty, DashboardError, DashboardLoading } from "./dashboard-states";
import { OccurrencesTimeseries } from "./occurrences-timeseries";
import { RecentOccurrences } from "./recent-occurrences";
import { RegionBreakdown } from "./region-breakdown";
import { StatCards } from "./stat-cards";
import { StatusDonut } from "./status-donut";
import { TypeBreakdown } from "./type-breakdown";

const DEFAULT_FILTERS: OccurrenceSummaryFilters = { period: "7d" };

function buildExportHref(filters: OccurrenceSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.period) params.set("period", filters.period);
  const query = params.toString();
  return query ? `/api/occurrences/export?${query}` : "/api/occurrences/export";
}

/**
 * Dashboard de ocorrências do painel admin (US10 v2). Filtra por tipo/status/
 * período, mostra cards com tendência, mapa, donut de status, barras por tipo,
 * série temporal, regiões por bairro e ocorrências recentes. A rota /admin é
 * protegida pelo middleware (AC1).
 */
export function OccurrenceDashboard() {
  const [filters, setFilters] = useState<OccurrenceSummaryFilters>(DEFAULT_FILTERS);
  const { state, reload, isRefreshing } = useOccurrenceSummary(filters);

  const selectType = (type: OccurrenceType | undefined) =>
    setFilters((current) => ({ ...current, type }));

  return (
    <section className="flex flex-col gap-4">
      <DashboardToolbar
        filters={filters}
        onChange={setFilters}
        onRefresh={reload}
        isRefreshing={isRefreshing}
        exportHref={buildExportHref(filters)}
      />
      <DashboardContent
        state={state}
        onRetry={reload}
        selectedType={filters.type}
        onSelectType={selectType}
      />
    </section>
  );
}

function DashboardContent({
  state,
  onRetry,
  selectedType,
  onSelectType,
}: {
  state: SummaryState;
  onRetry: () => void;
  selectedType?: OccurrenceType;
  onSelectType: (type: OccurrenceType | undefined) => void;
}) {
  if (state.status === "loading") return <DashboardLoading />;
  if (state.status === "error") return <DashboardError onRetry={onRetry} />;
  if (state.summary.total === 0) return <DashboardEmpty />;

  return (
    <DashboardGrid
      summary={state.summary}
      selectedType={selectedType}
      onSelectType={onSelectType}
    />
  );
}

function DashboardGrid({
  summary,
  selectedType,
  onSelectType,
}: {
  summary: OccurrenceSummary;
  selectedType?: OccurrenceType;
  onSelectType: (type: OccurrenceType | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <StatCards summary={summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardMap points={summary.mapPoints} />
        <div className="flex flex-col gap-4">
          <StatusDonut summary={summary} />
          <TypeBreakdown
            byType={summary.byType}
            selectedType={selectedType}
            onSelectType={onSelectType}
          />
        </div>
      </div>

      <OccurrencesTimeseries points={summary.timeSeries} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RegionBreakdown regions={summary.regions} />
        <RecentOccurrences items={summary.recent} />
      </div>
    </div>
  );
}
