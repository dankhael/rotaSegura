import { Edit3, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";

import { AdminTypeBadge } from "@/components/admin/admin-type-badge";
import { Button } from "@/components/ui/button";
import { donationChannelLabel } from "@/lib/donations/form";
import type { DonationChannelType, DonationPoint } from "@/types/donation";

const CHANNEL_TONE: Record<DonationChannelType, ComponentProps<typeof AdminTypeBadge>["tone"]> = {
  PIX_KEY: "safe",
  QR_CODE: "info",
  EXTERNAL_LINK: "warn",
};

type DonationsTableProps = {
  points: DonationPoint[];
  editingId?: string;
  deletingId: string | null;
  onEdit: (point: DonationPoint) => void;
  onDelete: (point: DonationPoint) => void;
};

export function DonationsTable({
  points,
  editingId,
  deletingId,
  onEdit,
  onDelete,
}: DonationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[23%]" />
          <col className="w-[15%]" />
          <col className="w-[30%]" />
          <col className="w-[22%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="bg-(--surface-2) text-left text-xs font-semibold uppercase text-(--ink-4)">
          <tr>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Descrição</th>
            <th className="px-4 py-3">Canal</th>
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
              <td className="px-4 py-3 font-semibold text-(--ink-2)">
                <span className="block truncate" title={point.title}>
                  {point.title}
                </span>
              </td>
              <td className="px-4 py-3">
                <AdminTypeBadge
                  label={donationChannelLabel(point.channelType)}
                  tone={CHANNEL_TONE[point.channelType]}
                />
              </td>
              <td className="px-4 py-3 text-(--ink-3)">
                <span
                  className="block max-h-10 overflow-hidden leading-5"
                  title={point.description}
                >
                  {point.description}
                </span>
              </td>
              <td className="px-4 py-3 text-(--ink-3)">
                <span className="block truncate" title={point.channelValue}>
                  {point.channelValue}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onEdit(point)}
                    aria-label={`Editar ${point.title}`}
                  >
                    <Edit3 />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => onDelete(point)}
                    disabled={deletingId === point.id}
                    aria-label={`Remover ${point.title}`}
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
