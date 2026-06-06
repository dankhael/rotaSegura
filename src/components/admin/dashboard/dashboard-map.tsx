"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

import { useSupportPoints } from "@/lib/hooks/use-support-points";
import { OCCURRENCE_TYPE_LABEL, OCCURRENCE_TYPES } from "@/lib/occurrences/labels";
import { OCCURRENCE_TYPE_COLOR } from "@/lib/occurrences/type-visuals";
import type { Occurrence } from "@/types/occurrence";
import type { MapPoint } from "@/types/occurrence-summary";

import { DashboardPanel } from "./panel";

const ShelterMap = dynamic(() => import("@/components/ui/ShelterMap"), {
  ssr: false,
  loading: () => (
    <div
      className="grid h-[420px] w-full place-items-center"
      style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}
    >
      Carregando mapa...
    </div>
  ),
});

type LegendEntry = { color: string; label: string };

const OCCURRENCE_LEGEND: LegendEntry[] = OCCURRENCE_TYPES.map((type) => ({
  color: OCCURRENCE_TYPE_COLOR[type],
  label: OCCURRENCE_TYPE_LABEL[type],
}));

// Espelha SUPPORT_POINT_STYLE do ShelterMap (cores dos marcadores de apoio).
const SUPPORT_POINT_LEGEND: LegendEntry[] = [
  { color: "oklch(0.55 0.13 240)", label: "Abrigo" },
  { color: "oklch(0.62 0.19 25)", label: "Médico" },
  { color: "oklch(0.62 0.13 150)", label: "Suprimentos" },
  { color: "oklch(0.55 0.02 250)", label: "Outro ponto" },
];

// "Mapa de ocorrências": reaproveita o ShelterMap (US06) com as ocorrências
// filtradas pelo dashboard + os pontos de apoio, cada camada com toggle.
export function DashboardMap({ points }: { points: MapPoint[] }) {
  const { supportPoints } = useSupportPoints();
  const [showOccurrences, setShowOccurrences] = useState(true);
  const [showSupportPoints, setShowSupportPoints] = useState(true);

  return (
    <DashboardPanel
      title="Mapa de ocorrências"
      subtitle={`${points.length} ocorrência(s) · ${supportPoints.length} ponto(s) de apoio`}
      icon={<MapIcon size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
      action={
        <div role="group" aria-label="Camadas do mapa" className="flex items-center gap-2">
          <LayerChip
            active={showOccurrences}
            color="var(--emergency)"
            label="Ocorrências"
            onToggle={() => setShowOccurrences((on) => !on)}
          />
          <LayerChip
            active={showSupportPoints}
            color="var(--rs-info)"
            label="Pontos de apoio"
            onToggle={() => setShowSupportPoints((on) => !on)}
          />
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
        <ShelterMap
          occurrences={showOccurrences ? points.map(toOccurrence) : []}
          supportPoints={showSupportPoints ? supportPoints : []}
        />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {showOccurrences && <LegendRow title="Ocorrências" entries={OCCURRENCE_LEGEND} />}
        {showSupportPoints && <LegendRow title="Pontos de apoio" entries={SUPPORT_POINT_LEGEND} />}
      </div>
    </DashboardPanel>
  );
}

function LayerChip({
  active,
  color,
  label,
  onToggle,
}: {
  active: boolean;
  color: string;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
      style={{
        borderColor: active ? color : "var(--line)",
        background: active ? `color-mix(in oklab, ${color} 12%, white)` : "var(--surface)",
        color: active ? "var(--ink-2)" : "var(--ink-4)",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: active ? color : "var(--ink-4)" }}
        aria-hidden
      />
      {label}
    </button>
  );
}

function LegendRow({ title, entries }: { title: string; entries: LegendEntry[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-xs font-semibold uppercase" style={{ color: "var(--ink-4)" }}>
        {title}
      </span>
      {entries.map((entry) => (
        <span
          key={entry.label}
          className="inline-flex items-center gap-1.5"
          style={{ fontSize: 12, color: "var(--ink-3)" }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color }}
            aria-hidden
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

function toOccurrence(point: MapPoint): Occurrence {
  return {
    id: point.id,
    type: point.type,
    status: point.status,
    centroidLatitude: point.latitude,
    centroidLongitude: point.longitude,
    reportCount: point.reportCount,
    uniqueDeviceCount: point.uniqueDeviceCount,
    firstReportedAt: point.lastReportedAt,
    lastReportedAt: point.lastReportedAt,
    confirmedAt: null,
    createdAt: point.lastReportedAt,
    updatedAt: point.lastReportedAt,
  };
}
