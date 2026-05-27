import { ModalButton } from "./modal-button";
import { InfoRow } from "./info-row";

type ModalConfirmProps = {
  occurrenceLabel: string;
  occurrenceIcon: string;
  address: string;
  occurredAt: string;

  isSubmitting: boolean;

  onBack: () => void;
  onConfirm: () => void;
};

export function ModalConfirm({
  occurrenceLabel,
  occurrenceIcon,
  address,
  occurredAt,
  isSubmitting,
  onBack,
  onConfirm,
}: ModalConfirmProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* HEADER CENTRALIZADO */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl shadow-md">
          ✅
        </div>

        <h2 className="text-xl font-bold">Confirmar envio</h2>

        <p className="text-sm text-muted-foreground">Confira os dados antes de enviar</p>
      </div>

      {/* CARD */}
      <div
        className="
        border border-white/10
        rounded-2xl
        p-5
        bg-white/5
        backdrop-blur-md
        shadow-lg
        flex flex-col
        gap-4
      "
      >
        <InfoRow label="Ocorrência" value={occurrenceLabel} icon={occurrenceIcon} />

        <InfoRow label="Localização" value={address} icon="📌" />

        <InfoRow label="Horário" value={occurredAt} icon="🕒" />
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 pt-2">
        <ModalButton label="Voltar" variant="secondary" onClick={onBack} />

        <ModalButton
          label={isSubmitting ? "Enviando..." : "Confirmar"}
          onClick={onConfirm}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}
