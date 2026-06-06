import { PieChart } from "lucide-react";

import type { OccurrenceSummary } from "@/types/occurrence-summary";

import { DonutChart } from "./charts/donut-chart";
import { DashboardPanel } from "./panel";

// "Situação em tempo real": donut de pendentes vs. confirmadas + legenda.
export function StatusDonut({ summary }: { summary: OccurrenceSummary }) {
  const { pending, confirmed } = summary.byStatus;
  const total = pending + confirmed;

  return (
    <DashboardPanel
      title="Situação em tempo real"
      subtitle="Pendentes vs. confirmadas"
      icon={<PieChart size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
    >
      <div className="flex flex-wrap items-center gap-5">
        <DonutChart
          segments={[
            { value: confirmed, color: "var(--safe)", label: "Confirmada" },
            { value: pending, color: "var(--warn)", label: "Pendente" },
          ]}
          centerPrimary={String(total)}
          centerSecondary="ocorrências"
          ariaLabel={`${confirmed} confirmadas e ${pending} pendentes de ${total}`}
        />
        <ul className="flex flex-1 flex-col gap-3" style={{ minWidth: 160 }}>
          <LegendRow
            color="var(--safe)"
            label="Confirmada"
            value={confirmed}
            percent={percent(confirmed, total)}
          />
          <LegendRow
            color="var(--warn)"
            label="Pendente"
            value={pending}
            percent={percent(pending, total)}
          />
        </ul>
      </div>
    </DashboardPanel>
  );
}

function LegendRow({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} aria-hidden />
      <span className="flex-1" style={{ fontSize: 14, color: "var(--ink-2)" }}>
        {label}
      </span>
      <span className="font-bold" style={{ fontSize: 14, color: "var(--ink)" }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{percent}%</span>
    </li>
  );
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
