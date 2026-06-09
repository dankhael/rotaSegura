import { Plus, Save, X } from "lucide-react";

import {
  AdminSelectField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/admin/admin-form-fields";
import { Button } from "@/components/ui/button";
import {
  DONATION_CHANNEL_TYPES,
  donationChannelPlaceholder,
  donationChannelValueLabel,
  type DonationFieldErrors,
  type DonationFormState,
} from "@/lib/donations/form";

type DonationFormProps = {
  form: DonationFormState;
  errors: DonationFieldErrors;
  editing: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof DonationFormState>(field: K, value: DonationFormState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function DonationForm({
  form,
  errors,
  editing,
  saving,
  onFieldChange,
  onSubmit,
  onReset,
}: DonationFormProps) {
  return (
    <section
      className="border bg-(--surface) p-4"
      style={{ borderColor: "var(--line)", borderRadius: "var(--r-lg)" }}
      aria-labelledby="donation-form-title"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="donation-form-title" className="text-lg font-bold text-(--ink-2)">
            {editing ? "Editar doação" : "Novo canal"}
          </h2>
          <p className="mt-1 text-sm text-(--ink-3)">
            {editing
              ? "Atualize o canal selecionado."
              : "Cadastre um canal financeiro para situações de emergência."}
          </p>
        </div>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            disabled={saving}
            aria-label="Cancelar edição"
          >
            <X />
          </Button>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <AdminTextField
          label="Título"
          value={form.title}
          onChange={(value) => onFieldChange("title", value)}
          error={errors.title}
          required
        />

        <AdminTextareaField
          label="Descrição"
          value={form.description}
          onChange={(value) => onFieldChange("description", value)}
          error={errors.description}
          required
          placeholder="Explique o destino da doação."
        />

        <AdminSelectField
          label="Tipo do canal"
          value={form.channelType}
          options={DONATION_CHANNEL_TYPES}
          onChange={(value) => onFieldChange("channelType", value)}
          error={errors.channelType}
        />

        <AdminTextField
          label={donationChannelValueLabel(form.channelType)}
          value={form.channelValue}
          onChange={(value) => onFieldChange("channelValue", value)}
          error={errors.channelValue}
          placeholder={donationChannelPlaceholder(form.channelType)}
          required
        />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
            Limpar
          </Button>
          <Button type="submit" disabled={saving} aria-busy={saving}>
            {editing ? <Save /> : <Plus />}
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar canal"}
          </Button>
        </div>
      </form>
    </section>
  );
}
