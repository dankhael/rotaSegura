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
    <>
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            margin: "0 auto 14px",
            background: "rgba(0,200,120,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: "0 10px 30px rgba(0,200,120,0.18)",
          }}
        >
          ✅
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Confirmar envio
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--ink-3)",
          }}
        >
          Confira os dados da ocorrência
        </p>
      </div>

      {/* CARD */}

      <div
        style={{
          border: "2px solid rgba(255,255,255,0.08)",

          borderRadius: 18,

          padding: 18,

          background: "rgba(255,255,255,0.03)",

          display: "flex",

          flexDirection: "column",

          gap: 16,

          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",

          backdropFilter: "blur(6px)",
        }}
      >
        <InfoRow label="Ocorrência" value={occurrenceLabel} icon={occurrenceIcon} />

        <InfoRow label="Localização" value={address} icon="📌" />

        <InfoRow label="Horário" value={occurredAt} icon="🕒" />
      </div>

      {/* ACTIONS */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 24,
        }}
      >
        <ModalButton label="Voltar" variant="secondary" onClick={onBack} />

        <ModalButton
          label={isSubmitting ? "Enviando..." : "Confirmar"}
          onClick={onConfirm}
          disabled={isSubmitting}
        />
      </div>
    </>
  );
}
