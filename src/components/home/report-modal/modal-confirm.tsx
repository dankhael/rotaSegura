import { useState } from "react";
import { Pencil } from "lucide-react";

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
  onLocationSearch: (query: string) => Promise<string>;
};

export function ModalConfirm({
  occurrenceLabel,
  occurrenceIcon,
  address,
  occurredAt,
  isSubmitting,
  onBack,
  onConfirm,
  onLocationSearch,
}: ModalConfirmProps) {
  const [editingLocation, setEditingLocation] = useState(false);
  const [draftAddress, setDraftAddress] = useState(address);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  function startLocationEdit() {
    setDraftAddress(address);
    setLocationError(null);
    setEditingLocation(true);
  }

  function cancelLocationEdit() {
    setDraftAddress(address);
    setLocationError(null);
    setEditingLocation(false);
  }

  async function saveLocationEdit() {
    const query = draftAddress.trim();
    if (!query || savingLocation) return;

    setSavingLocation(true);
    setLocationError(null);

    try {
      await onLocationSearch(query);
      setEditingLocation(false);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Local nao encontrado");
    } finally {
      setSavingLocation(false);
    }
  }

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

        <LocationRow
          address={address}
          draftAddress={draftAddress}
          editing={editingLocation}
          error={locationError}
          saving={savingLocation}
          onDraftChange={setDraftAddress}
          onEdit={startLocationEdit}
        />

        <InfoRow label="Horário" value={occurredAt} icon="🕒" />
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 pt-2">
        {editingLocation ? (
          <>
            <ModalButton
              label="Cancelar"
              variant="secondary"
              onClick={cancelLocationEdit}
              disabled={savingLocation}
            />
            <ModalButton
              label={savingLocation ? "Buscando..." : "Salvar endereço"}
              onClick={saveLocationEdit}
              disabled={savingLocation || draftAddress.trim().length === 0}
            />
          </>
        ) : (
          <>
            <ModalButton label="Voltar" variant="secondary" onClick={onBack} />

            <ModalButton
              label={isSubmitting ? "Enviando..." : "Confirmar"}
              onClick={onConfirm}
              disabled={isSubmitting}
            />
          </>
        )}
      </div>
    </div>
  );
}

function LocationRow({
  address,
  draftAddress,
  editing,
  error,
  saving,
  onDraftChange,
  onEdit,
}: {
  address: string;
  draftAddress: string;
  editing: boolean;
  error: string | null;
  saving: boolean;
  onDraftChange: (value: string) => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="
          w-9 h-9
          rounded-xl
          flex items-center justify-center
          shrink-0
          text-[18px]
          bg-white/5
          shadow-md
        "
      >
        📌
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs text-(--ink-3)">Localização</span>
          {!editing && (
            <button
              type="button"
              aria-label="Editar localização"
              onClick={onEdit}
              className="inline-grid size-7 place-items-center rounded-lg border border-(--line) text-(--ink-3) transition-colors hover:bg-(--line-soft) hover:text-(--ink)"
            >
              <Pencil aria-hidden size={14} />
            </button>
          )}
        </div>

        {editing ? (
          <div className="grid gap-2">
            <input
              type="search"
              aria-label="Novo endereço"
              value={draftAddress}
              onChange={(event) => onDraftChange(event.target.value)}
              disabled={saving}
              className="h-11 rounded-xl border border-(--line) bg-(--surface) px-3 text-sm font-semibold text-(--ink) outline-none transition focus:border-(--rs-info)"
            />
            {error && (
              <p role="alert" className="text-xs font-semibold text-(--emergency-ink)">
                {error}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm font-semibold leading-relaxed text-(--ink)">{address}</span>
        )}
      </div>
    </div>
  );
}
