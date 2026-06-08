import { TrendingUp } from "lucide-react";

import type { TimeSeriesPoint } from "@/types/occurrence-summary";

import { StackedAreaChart } from "./charts/stacked-area-chart";
import { DashboardPanel } from "./panel";

// "Ocorrências ao longo do tempo": área empilhada pendentes/confirmadas no período.
export function OccurrencesTimeseries({ points }: { points: TimeSeriesPoint[] }) {
  return (
    <DashboardPanel
      title="Ocorrências ao longo do tempo"
      subtitle={`Últimos ${points.length} dia(s)`}
      icon={<TrendingUp size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
      action={<TimeseriesLegend />}
    >
      <StackedAreaChart
        series={[
          {
            label: "Pendentes",
            color: "var(--warn)",
            values: points.map((point) => point.pending),
          },
          {
            label: "Confirmadas",
            color: "var(--safe)",
            values: points.map((point) => point.confirmed),
          },
        ]}
        ariaLabel="Pendentes e confirmadas por dia no período"
      />
      <div className="mt-2 flex justify-between" style={{ fontSize: 11, color: "var(--ink-4)" }}>
        {axisLabels(points).map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </DashboardPanel>
  );
}

function TimeseriesLegend() {
  return (
    <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--ink-3)" }}>
      <LegendDot color="var(--warn)" label="Pendentes" />
      <LegendDot color="var(--safe)" label="Confirmadas" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

// Mostra no máximo ~7 rótulos de data (DD/MM) para o eixo não embolar.
function axisLabels(points: TimeSeriesPoint[]): string[] {
  if (points.length === 0) return [];
  const maxLabels = 7;
  const step = Math.max(1, Math.ceil(points.length / maxLabels));
  return points.filter((_, index) => index % step === 0).map((point) => formatDayMonth(point.date));
}

function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
