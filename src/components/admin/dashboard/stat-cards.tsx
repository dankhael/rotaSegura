import { Activity, ChevronDown, ChevronUp, CircleCheck, Clock, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OccurrenceSummary } from "@/types/occurrence-summary";

import { Sparkline } from "./charts/sparkline";

type DeltaIntent = "neutral" | "riseBad" | "riseGood";

type StatCardModel = {
  label: string;
  value: number;
  delta: number;
  intent: DeltaIntent;
  sublabel: string;
  series: number[];
  accent: string;
  icon: LucideIcon;
};

// AC: total + por status + gravidade alta, com tendência vs período anterior e
// sparkline da série do período.
export function StatCards({ summary }: { summary: OccurrenceSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {buildStatCards(summary).map((card) => (
        <StatCard key={card.label} card={card} />
      ))}
    </div>
  );
}

function buildStatCards(summary: OccurrenceSummary): StatCardModel[] {
  const series = summary.timeSeries;
  return [
    {
      label: "Total de ocorrências",
      value: summary.total,
      delta: summary.trend.total,
      intent: "neutral",
      sublabel: "vs. período anterior",
      series: series.map((point) => point.pending + point.confirmed),
      accent: "var(--rs-info)",
      icon: Activity,
    },
    {
      label: "Pendentes",
      value: summary.byStatus.pending,
      delta: summary.trend.pending,
      intent: "riseBad",
      sublabel: "aguardam triagem",
      series: series.map((point) => point.pending),
      accent: "var(--warn)",
      icon: Clock,
    },
    {
      label: "Confirmadas",
      value: summary.byStatus.confirmed,
      delta: summary.trend.confirmed,
      intent: "riseGood",
      sublabel: confirmationSublabel(summary.avgConfirmationMinutes),
      series: series.map((point) => point.confirmed),
      accent: "var(--safe)",
      icon: CircleCheck,
    },
    {
      label: "Gravidade alta",
      value: summary.bySeverity.high,
      delta: summary.trend.high,
      intent: "riseBad",
      sublabel: "exigem prioridade",
      series: series.map((point) => point.high),
      accent: "var(--emergency)",
      icon: TriangleAlert,
    },
  ];
}

function StatCard({ card }: { card: StatCardModel }) {
  const Icon = card.icon;
  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${card.accent}`,
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between">
        <span
          className="text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.04em", color: "var(--ink-3)" }}
        >
          {card.label}
        </span>
        <Icon size={18} aria-hidden style={{ color: card.accent }} />
      </div>

      <span className="font-bold" style={{ fontSize: 30, lineHeight: 1, color: "var(--ink)" }}>
        {card.value}
      </span>

      <div className="flex items-end justify-between gap-2">
        <DeltaBadge delta={card.delta} intent={card.intent} sublabel={card.sublabel} />
        <Sparkline
          values={card.series}
          color={card.accent}
          ariaLabel={`Tendência de ${card.label}`}
        />
      </div>
    </div>
  );
}

function DeltaBadge({
  delta,
  intent,
  sublabel,
}: {
  delta: number;
  intent: DeltaIntent;
  sublabel: string;
}) {
  const color = deltaColor(delta, intent);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color }}>
        {delta > 0 ? (
          <ChevronUp size={13} aria-hidden />
        ) : delta < 0 ? (
          <ChevronDown size={13} aria-hidden />
        ) : null}
        {delta > 0 ? `+${delta}` : delta}
      </span>
      <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{sublabel}</span>
    </div>
  );
}

function deltaColor(delta: number, intent: DeltaIntent): string {
  if (delta === 0 || intent === "neutral") return "var(--ink-4)";
  const isBad = delta > 0 ? intent === "riseBad" : intent === "riseGood";
  return isBad ? "var(--emergency-ink)" : "var(--safe-ink)";
}

function confirmationSublabel(minutes: number | null): string {
  if (minutes === null) return "nenhuma confirmada";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const formatted = hours > 0 ? `${hours}h${String(rest).padStart(2, "0")}min` : `${rest}min`;
  return `méd. ${formatted} p/ confirmar`;
}
