import { MapPinned } from "lucide-react";

import type { RegionSummary } from "@/types/occurrence-summary";

import { DashboardPanel } from "./panel";

const MAX_REGIONS = 8;

// "Regiões mais afetadas · Por bairro": ranking com barra empilhada pend/conf.
export function RegionBreakdown({ regions }: { regions: RegionSummary[] }) {
  const ranked = regions.slice(0, MAX_REGIONS);

  return (
    <DashboardPanel
      title="Regiões mais afetadas"
      subtitle="Por bairro · pendentes e confirmadas"
      icon={<MapPinned size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
    >
      {ranked.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Nenhuma ocorrência no período.</p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {ranked.map((region, index) => (
            <RegionRow key={region.region} region={region} rank={index + 1} />
          ))}
        </ol>
      )}
    </DashboardPanel>
  );
}

function RegionRow({ region, rank }: { region: RegionSummary; rank: number }) {
  const confirmedPct = region.total > 0 ? (region.confirmed / region.total) * 100 : 0;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className="grid h-5 w-5 place-items-center rounded text-xs font-bold"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            color: "var(--ink-3)",
          }}
          aria-hidden
        >
          {rank}
        </span>
        <span className="flex-1 font-semibold" style={{ fontSize: 14, color: "var(--ink)" }}>
          {region.region}
        </span>
        <span className="font-bold" style={{ fontSize: 14, color: "var(--ink)" }}>
          {region.total}
        </span>
      </div>

      <div
        className="flex h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--line-soft)" }}
      >
        <div style={{ width: `${confirmedPct}%`, background: "var(--safe)" }} aria-hidden />
        <div style={{ width: `${100 - confirmedPct}%`, background: "var(--warn)" }} aria-hidden />
      </div>

      <div className="flex gap-3" style={{ fontSize: 12 }}>
        <span style={{ color: "var(--warn-ink)" }}>{region.pending} pendentes</span>
        <span style={{ color: "var(--safe-ink)" }}>{region.confirmed} confirmadas</span>
      </div>
    </li>
  );
}
