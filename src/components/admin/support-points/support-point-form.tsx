import { useState } from "react";
import { Plus, Save, Search, X } from "lucide-react";

import {
  SupportPointSelectField,
  SupportPointTextField,
} from "@/components/admin/support-points/support-point-fields";
import { Button } from "@/components/ui/button";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { SupportPointFieldErrors, SupportPointFormState } from "@/lib/support-points/form";

type SupportPointFormProps = {
  form: SupportPointFormState;
  errors: SupportPointFieldErrors;
  editing: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof SupportPointFormState>(
    field: K,
    value: SupportPointFormState[K],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

type AddressFeedback = {
  type: "success" | "error";
  message: string;
} | null;

export function SupportPointForm({
  form,
  errors,
  editing,
  saving,
  onFieldChange,
  onSubmit,
  onReset,
}: SupportPointFormProps) {
  const [address, setAddress] = useState("");
  const [addressFeedback, setAddressFeedback] = useState<AddressFeedback>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);

  async function handleAddressSearch() {
    const query = address.trim();
    if (!query || searchingAddress) return;

    setSearchingAddress(true);
    setAddressFeedback(null);

    try {
      const response = await fetch(`${apiEndpoints.geocode}?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Local nao encontrado");
      }

      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Local nao encontrado");
      }

      onFieldChange("latitude", String(latitude));
      onFieldChange("longitude", String(longitude));
      setAddressFeedback({
        type: "success",
        message: "Coordenadas preenchidas a partir do endereço.",
      });
    } catch (error) {
      setAddressFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Local nao encontrado",
      });
    } finally {
      setSearchingAddress(false);
    }
  }

  function handleReset() {
    setAddress("");
    setAddressFeedback(null);
    onReset();
  }

  return (
    <section
      className="border bg-(--surface) p-4"
      style={{ borderColor: "var(--line)", borderRadius: "var(--r-lg)" }}
      aria-labelledby="support-point-form-title"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="support-point-form-title" className="text-lg font-bold text-(--ink-2)">
            {editing ? "Editar local" : "Novo local"}
          </h2>
          <p className="mt-1 text-sm text-(--ink-3)">
            {editing
              ? "Atualize os dados do ponto selecionado."
              : "Cadastre um ponto usado no mapa e nas rotas."}
          </p>
        </div>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleReset}
            aria-label="Cancelar edição"
          >
            <X />
          </Button>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <SupportPointTextField
          label="Nome"
          value={form.name}
          onChange={(value) => onFieldChange("name", value)}
          error={errors.name}
          required
        />

        <SupportPointSelectField
          label="Tipo"
          value={form.type}
          onChange={(value) => onFieldChange("type", value)}
          error={errors.type}
        />

        <SupportPointTextField
          label="Capacidade"
          value={form.capacity}
          onChange={(value) => onFieldChange("capacity", value)}
          error={errors.capacity}
          inputMode="numeric"
          placeholder="Opcional"
        />

        <div className="grid gap-2">
          <label htmlFor="support-point-address" className="text-sm font-semibold text-(--ink-2)">
            Endereço
          </label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              id="support-point-address"
              type="search"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setAddressFeedback(null);
              }}
              disabled={searchingAddress || saving}
              placeholder="Ex.: Boa Viagem, Recife"
              className="h-10 rounded-lg border bg-(--surface) px-3 text-sm text-(--ink) outline-none transition focus-visible:ring-2 focus-visible:ring-(--rs-info)"
              style={{
                borderColor: addressFeedback?.type === "error" ? "var(--emergency)" : "var(--line)",
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleAddressSearch()}
              disabled={searchingAddress || saving || address.trim().length === 0}
              aria-busy={searchingAddress}
            >
              <Search />
              {searchingAddress ? "Buscando..." : "Buscar endereço"}
            </Button>
          </div>
          {addressFeedback && (
            <p
              role={addressFeedback.type === "error" ? "alert" : "status"}
              className={
                addressFeedback.type === "error"
                  ? "text-xs font-medium text-(--emergency-ink)"
                  : "text-xs font-medium text-(--safe-ink)"
              }
            >
              {addressFeedback.message}
            </p>
          )}
        </div>

        <div className="grid gap-4">
          <SupportPointTextField
            label="Latitude"
            value={form.latitude}
            onChange={(value) => onFieldChange("latitude", value)}
            error={errors.latitude}
            inputMode="decimal"
            required
          />
          <SupportPointTextField
            label="Longitude"
            value={form.longitude}
            onChange={(value) => onFieldChange("longitude", value)}
            error={errors.longitude}
            inputMode="decimal"
            required
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
            Limpar
          </Button>
          <Button type="submit" disabled={saving} aria-busy={saving}>
            {editing ? <Save /> : <Plus />}
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar local"}
          </Button>
        </div>
      </form>
    </section>
  );
}
