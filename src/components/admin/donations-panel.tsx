"use client";

import { useEffect, useState } from "react";

import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { AdminManagementLayout } from "@/components/admin/admin-management-layout";
import { DonationForm } from "@/components/admin/donations/donation-form";
import { DonationsEmptyState } from "@/components/admin/donations/donations-empty-state";
import { DonationsTable } from "@/components/admin/donations/donations-table";
import {
  deleteDonationPoint,
  DonationApiError,
  fetchDonationPoints,
  saveDonationPoint,
} from "@/lib/donations/client";
import {
  buildDonationPayload,
  donationPointToFormState,
  EMPTY_DONATION_FORM,
  hasDonationFieldErrors,
  validateDonationForm,
  type DonationFieldErrors,
  type DonationFormState,
} from "@/lib/donations/form";
import type { DonationPoint } from "@/types/donation";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function DonationsPanel() {
  const [points, setPoints] = useState<DonationPoint[]>([]);
  const [form, setForm] = useState<DonationFormState>(EMPTY_DONATION_FORM);
  const [errors, setErrors] = useState<DonationFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingPoint, setEditingPoint] = useState<DonationPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = Boolean(editingPoint);

  useEffect(() => {
    let cancelled = false;

    fetchDonationPoints()
      .then((nextPoints) => {
        if (!cancelled) setPoints(nextPoints);
      })
      .catch(() => {
        if (!cancelled) showError("Não foi possível carregar os canais. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function showError(message: string) {
    setFeedback({ type: "error", message });
  }

  function updateField<K extends keyof DonationFormState>(field: K, value: DonationFormState[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "channelType") next.channelValue = "";
      return next;
    });
    setErrors((current) => ({ ...current, [field]: "", channelValue: "" }));
  }

  function resetForm() {
    setForm(EMPTY_DONATION_FORM);
    setErrors({});
    setEditingPoint(null);
  }

  function startEditing(point: DonationPoint) {
    setEditingPoint(point);
    setForm(donationPointToFormState(point));
    setErrors({});
    setFeedback(null);
  }

  function upsertPoint(savedPoint: DonationPoint) {
    setPoints((current) =>
      isEditing
        ? current.map((point) => (point.id === savedPoint.id ? savedPoint : point))
        : [savedPoint, ...current],
    );
  }

  function handleApiError(error: unknown, fallback: string) {
    if (error instanceof DonationApiError) {
      setErrors(error.fieldErrors);
      showError(error.message);
      return;
    }
    showError(fallback);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const fieldErrors = validateDonationForm(form);
    if (hasDonationFieldErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    try {
      const savedPoint = await saveDonationPoint(buildDonationPayload(form), editingPoint?.id);
      upsertPoint(savedPoint);
      setFeedback({
        type: "success",
        message: isEditing ? "Canal atualizado com sucesso." : "Canal cadastrado com sucesso.",
      });
      resetForm();
    } catch (error) {
      handleApiError(error, "Não foi possível salvar o canal. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(point: DonationPoint) {
    const confirmed = window.confirm(`Remover "${point.title}" da lista de canais de doação?`);
    if (!confirmed) return;

    setDeletingId(point.id);
    setFeedback(null);

    try {
      await deleteDonationPoint(point.id);
      setPoints((current) => current.filter((item) => item.id !== point.id));
      if (editingPoint?.id === point.id) resetForm();
      setFeedback({ type: "success", message: "Canal removido com sucesso." });
    } catch (error) {
      handleApiError(error, "Não foi possível remover o canal. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminManagementLayout>
      <section
        className="overflow-hidden border bg-(--surface)"
        style={{ borderColor: "var(--line)", borderRadius: "var(--r-lg)" }}
      >
        <div
          className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <h2 className="text-lg font-bold text-(--ink-2)">Canais de doação</h2>
            <p className="mt-1 text-sm text-(--ink-3)">
              {loading ? "Carregando canais cadastrados..." : `${points.length} cadastrados.`}
            </p>
          </div>
        </div>

        {feedback && <AdminFeedback type={feedback.type} message={feedback.message} />}

        {loading ? (
          <AdminLoadingState message="Carregando canais..." />
        ) : points.length === 0 ? (
          <DonationsEmptyState onCreate={resetForm} />
        ) : (
          <DonationsTable
            points={points}
            editingId={editingPoint?.id}
            deletingId={deletingId}
            onEdit={startEditing}
            onDelete={(point) => void handleDelete(point)}
          />
        )}
      </section>

      <DonationForm
        form={form}
        errors={errors}
        editing={isEditing}
        saving={saving}
        onFieldChange={updateField}
        onSubmit={handleSubmit}
        onReset={resetForm}
      />
    </AdminManagementLayout>
  );
}
