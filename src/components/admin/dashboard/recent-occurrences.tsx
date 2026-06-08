import type { ReactNode } from "react";
import { History } from "lucide-react";

import { timeAgo } from "@/lib/format/time-ago";
import {
  OCCURRENCE_STATUS_LABEL,
  OCCURRENCE_TYPE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  STATUS_TONE,
  type Tone,
} from "@/lib/occurrences/labels";
import { OCCURRENCE_TYPE_COLOR } from "@/lib/occurrences/type-visuals";
import type { RecentOccurrence } from "@/types/occurrence-summary";

import { OCCURRENCE_TYPE_ICON } from "./type-icons";
import { DashboardPanel } from "./panel";

// "Ocorrências recentes": ícone por tipo, bairro, selo de gravidade e status, tempo relativo.
export function RecentOccurrences({ items }: { items: RecentOccurrence[] }) {
  return (
    <DashboardPanel
      title="Ocorrências recentes"
      subtitle={`${items.length} no período · ordenadas por data`}
      icon={<History size={18} aria-hidden style={{ color: "var(--ink-3)" }} />}
    >
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Nenhuma ocorrência no período.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, index) => (
            <RecentRow key={item.id} item={item} isFirst={index === 0} />
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}

function RecentRow({ item, isFirst }: { item: RecentOccurrence; isFirst: boolean }) {
  const Icon = OCCURRENCE_TYPE_ICON[item.type];
  const color = OCCURRENCE_TYPE_COLOR[item.type];

  return (
    <li
      className="flex items-center gap-3 py-2.5"
      style={{ borderTop: isFirst ? "none" : "1px solid var(--line-soft)" }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in oklab, ${color} 14%, white)`, color }}
        aria-hidden
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold" style={{ fontSize: 14, color: "var(--ink)" }}>
            {OCCURRENCE_TYPE_LABEL[item.type]}
          </span>
          <Badge tone={SEVERITY_TONE[item.severity]}>{SEVERITY_LABEL[item.severity]}</Badge>
        </div>
        <p className="truncate" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          {item.neighborhood} · #{item.id.slice(-6)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={STATUS_TONE[item.status]}>{OCCURRENCE_STATUS_LABEL[item.status]}</Badge>
        <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
          {timeAgo(item.lastReportedAt)}
        </span>
      </div>
    </li>
  );
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
      style={{ background: tone.background, border: `1px solid ${tone.border}`, color: tone.ink }}
    >
      {children}
    </span>
  );
}
