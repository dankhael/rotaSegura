import { Edit3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatSupportPointCapacity, supportPointTypeLabel } from "@/lib/support-points/form";
import type { SupportPoint, SupportPointType } from "@/types/support-point";

const TYPE_TONE: Record<SupportPointType, string> = {
  SHELTER: "border-(--rs-info)/25 bg-(--rs-info-soft) text-(--rs-info-ink)",
  MEDICAL: "border-(--emergency)/25 bg-(--emergency-soft) text-(--emergency-ink)",
  SUPPLY: "border-(--safe)/25 bg-(--safe-soft) text-(--safe-ink)",
  OTHER: "border-(--line) bg-(--surface-2) text-(--ink-3)",
};

type SupportPointsTableProps = {
  points: SupportPoint[];
  editingId?: string;
  deletingId: string | null;
  onEdit: (point: SupportPoint) => void;
  onDelete: (point: SupportPoint) => void;
};

export function SupportPointsTable({
  points,
  editingId,
  deletingId,
  onEdit,
  onDelete,
}: SupportPointsTableProps) {
  return (
    <div className="overflow-x-auto xl:overflow-visible">
      <table className="w-full min-w-[680px] border-collapse text-sm xl:min-w-0">
        <thead className="bg-(--surface-2) text-left text-xs font-semibold uppercase text-(--ink-4)">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Capacidade</th>
            <th className="px-4 py-3">Latitude</th>
            <th className="px-4 py-3">Longitude</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr
              key={point.id}
              className="border-t"
              style={{
                borderColor: "var(--line-soft)",
                background: editingId === point.id ? "var(--rs-info-soft)" : undefined,
              }}
            >
              <td className="px-4 py-3 font-semibold text-(--ink-2)">{point.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${TYPE_TONE[point.type]}`}
                >
                  {supportPointTypeLabel(point.type)}
                </span>
              </td>
              <td className="px-4 py-3 text-(--ink-3)">
                {formatSupportPointCapacity(point.capacity)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-(--ink-3)">{point.latitude}</td>
              <td className="px-4 py-3 font-mono text-xs text-(--ink-3)">{point.longitude}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onEdit(point)}
                    aria-label={`Editar ${point.name}`}
                  >
                    <Edit3 />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => onDelete(point)}
                    disabled={deletingId === point.id}
                    aria-label={`Remover ${point.name}`}
                    aria-busy={deletingId === point.id}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
