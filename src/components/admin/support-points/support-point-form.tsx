import { Plus, Save, X } from "lucide-react";

import {
  SupportPointSelectField,
  SupportPointTextField,
} from "@/components/admin/support-points/support-point-fields";
import { Button } from "@/components/ui/button";
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

export function SupportPointForm({
  form,
  errors,
  editing,
  saving,
  onFieldChange,
  onSubmit,
  onReset,
}: SupportPointFormProps) {
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
            onClick={onReset}
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
          <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
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
