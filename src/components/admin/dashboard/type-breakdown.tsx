import { BarChart3 } from "lucide-react";

import { OCCURRENCE_TYPE_LABEL } from "@/lib/occurrences/labels";
import { OCCURRENCE_TYPE_COLOR } from "@/lib/occurrences/type-visuals";
import type { OccurrenceType } from "@/types/occurrence";
import type { TypeCount } from "@/types/occurrence-summary";

import { OCCURRENCE_TYPE_ICON } from "./type-icons";
import { DashboardPanel } from "./panel";

type TypeBreakdownProps = {
  byType: TypeCount[];
  selectedType?: OccurrenceType;
  onSelectType: (type: OccurrenceType | undefined) => void;
};

// "Por tipo de ocorrência": barras clicáveis que aplicam/limpam o filtro de tipo.
export function TypeBreakdown({ byType, selectedType, onSelectType }: TypeBreakdownProps) {
  const total = byType.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <DashboardPanel
      title="Por tipo de ocorrência"
      subtitle="Clique para filtrar"
      icon={<BarChart3 size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
    >
      <ul className="flex flex-col gap-2">
        {byType.map((entry) => (
          <li key={entry.type}>
            <TypeRow
              entry={entry}
              total={total}
              active={selectedType === entry.type}
              onToggle={() => onSelectType(selectedType === entry.type ? undefined : entry.type)}
            />
          </li>
        ))}
      </ul>
    </DashboardPanel>
  );
}

function TypeRow({
  entry,
  total,
  active,
  onToggle,
}: {
  entry: TypeCount;
  total: number;
  active: boolean;
  onToggle: () => void;
}) {
  const color = OCCURRENCE_TYPE_COLOR[entry.type];
  const Icon = OCCURRENCE_TYPE_ICON[entry.type];
  const pct = total > 0 ? Math.round((entry.total / total) * 100) : 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="flex w-full flex-col gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors"
      style={{
        background: active ? "var(--surface-2)" : "transparent",
        outline: active ? `1px solid ${color}` : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} aria-hidden style={{ color }} />
        <span className="flex-1 font-medium" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
          {OCCURRENCE_TYPE_LABEL[entry.type]}
        </span>
        <span className="font-bold" style={{ fontSize: 13.5, color: "var(--ink)" }}>
          {entry.total}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--line-soft)" }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </button>
  );
}
