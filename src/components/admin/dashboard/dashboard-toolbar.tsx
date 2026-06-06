import { Download, RefreshCw } from "lucide-react";

import {
  OCCURRENCE_STATUS_LABEL,
  OCCURRENCE_STATUSES,
  OCCURRENCE_TYPE_LABEL,
  OCCURRENCE_TYPES,
} from "@/lib/occurrences/labels";
import type { DashboardPeriod } from "@/lib/occurrences/period";
import type { OccurrenceStatus, OccurrenceType } from "@/types/occurrence";
import type { OccurrenceSummaryFilters } from "@/types/occurrence-summary";

import { FilterSelect } from "./filter-select";

type DashboardToolbarProps = {
  filters: OccurrenceSummaryFilters;
  onChange: (next: OccurrenceSummaryFilters) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  exportHref: string;
};

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

// AC: filtros de tipo/status/período combináveis + ações de atualizar e exportar.
export function DashboardToolbar({
  filters,
  onChange,
  onRefresh,
  isRefreshing,
  exportHref,
}: DashboardToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        id="filter-type"
        label="Tipo"
        value={filters.type ?? ""}
        options={OCCURRENCE_TYPES.map((type) => ({
          value: type,
          label: OCCURRENCE_TYPE_LABEL[type],
        }))}
        onSelect={(value) =>
          onChange({ ...filters, type: (value || undefined) as OccurrenceType | undefined })
        }
      />
      <FilterSelect
        id="filter-status"
        label="Status"
        value={filters.status ?? ""}
        options={OCCURRENCE_STATUSES.map((status) => ({
          value: status,
          label: OCCURRENCE_STATUS_LABEL[status],
        }))}
        onSelect={(value) =>
          onChange({ ...filters, status: (value || undefined) as OccurrenceStatus | undefined })
        }
      />
      <PeriodToggle
        value={filters.period ?? "7d"}
        onSelect={(period) => onChange({ ...filters, period })}
      />

      {(filters.type || filters.status) && (
        <button
          type="button"
          onClick={() => onChange({ period: filters.period })}
          className="h-10 rounded-xl border px-4 text-sm font-semibold transition-colors"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface)",
            color: "var(--ink-3)",
          }}
        >
          Limpar
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface)",
            color: "var(--ink-2)",
          }}
        >
          <RefreshCw size={16} aria-hidden className={isRefreshing ? "animate-spin" : undefined} />
          {isRefreshing ? "Atualizando…" : "Atualizar"}
        </button>
        <a
          href={exportHref}
          download
          className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface)",
            color: "var(--ink-2)",
          }}
        >
          <Download size={16} aria-hidden />
          Exportar
        </a>
      </div>
    </div>
  );
}

function PeriodToggle({
  value,
  onSelect,
}: {
  value: DashboardPeriod;
  onSelect: (period: DashboardPeriod) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase" style={{ color: "var(--ink-3)" }}>
        Período
      </span>
      <div
        role="radiogroup"
        aria-label="Período"
        className="inline-flex h-10 items-center rounded-xl border p-1"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        {PERIOD_OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(option.value)}
              className="h-8 rounded-lg px-3 text-sm font-semibold transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--surface)" : "var(--ink-3)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
