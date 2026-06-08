"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { AdminManagementLayout } from "@/components/admin/admin-management-layout";
import { SupportPointForm } from "@/components/admin/support-points/support-point-form";
import { SupportPointsEmptyState } from "@/components/admin/support-points/support-points-empty-state";
import { SupportPointsFeedback } from "@/components/admin/support-points/support-points-feedback";
import { SupportPointsTable } from "@/components/admin/support-points/support-points-table";
import { Button } from "@/components/ui/button";
import {
  deleteSupportPoint,
  fetchSupportPoints,
  saveSupportPoint,
  SupportPointApiError,
} from "@/lib/support-points/client";
import {
  buildSupportPointPayload,
  EMPTY_SUPPORT_POINT_FORM,
  hasSupportPointFieldErrors,
  supportPointToFormState,
  validateSupportPointForm,
  type SupportPointFieldErrors,
  type SupportPointFormState,
} from "@/lib/support-points/form";
import type { SupportPoint } from "@/types/support-point";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function SupportPointsPanel() {
  const [points, setPoints] = useState<SupportPoint[]>([]);
  const [form, setForm] = useState<SupportPointFormState>(EMPTY_SUPPORT_POINT_FORM);
  const [errors, setErrors] = useState<SupportPointFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingPoint, setEditingPoint] = useState<SupportPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEditing = Boolean(editingPoint);
  const totalCapacity = useMemo(
    () => points.reduce((sum, point) => sum + (point.capacity ?? 0), 0),
    [points],
  );

  useEffect(() => {
    let cancelled = false;

    fetchSupportPoints()
      .then((nextPoints) => {
        if (!cancelled) setPoints(nextPoints);
      })
      .catch(() => {
        if (!cancelled) showError("Não foi possível carregar os locais. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPoints() {
    setLoading(true);
    setFeedback(null);

    try {
      setPoints(await fetchSupportPoints());
    } catch {
      showError("Não foi possível carregar os locais. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function showError(message: string) {
    setFeedback({ type: "error", message });
  }

  function updateField<K extends keyof SupportPointFormState>(
    field: K,
    value: SupportPointFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function resetForm() {
    setForm(EMPTY_SUPPORT_POINT_FORM);
    setErrors({});
    setEditingPoint(null);
  }

  function startEditing(point: SupportPoint) {
    setEditingPoint(point);
    setForm(supportPointToFormState(point));
    setErrors({});
    setFeedback(null);
  }

  function upsertPoint(savedPoint: SupportPoint) {
    setPoints((current) =>
      isEditing
        ? current.map((point) => (point.id === savedPoint.id ? savedPoint : point))
        : [savedPoint, ...current],
    );
  }

  function handleApiError(error: unknown, fallback: string) {
    if (error instanceof SupportPointApiError) {
      setErrors(error.fieldErrors);
      showError(error.message);
      return;
    }
    showError(fallback);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const fieldErrors = validateSupportPointForm(form);
    if (hasSupportPointFieldErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    try {
      const savedPoint = await saveSupportPoint(
        buildSupportPointPayload(form, isEditing),
        editingPoint?.id,
      );
      upsertPoint(savedPoint);
      setFeedback({
        type: "success",
        message: isEditing ? "Local atualizado com sucesso." : "Local cadastrado com sucesso.",
      });
      resetForm();
    } catch (error) {
      handleApiError(error, "Não foi possível salvar o local. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(point: SupportPoint) {
    const confirmed = window.confirm(`Remover "${point.name}" da lista de locais de apoio?`);
    if (!confirmed) return;

    setDeletingId(point.id);
    setFeedback(null);

    try {
      await deleteSupportPoint(point.id);
      setPoints((current) => current.filter((item) => item.id !== point.id));
      if (editingPoint?.id === point.id) resetForm();
      setFeedback({ type: "success", message: "Local removido com sucesso." });
    } catch (error) {
      handleApiError(error, "Não foi possível remover o local. Tente novamente.");
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
            <h2 className="text-lg font-bold text-(--ink-2)">Locais de apoio</h2>
            {loading ? (
              <p className="mt-1 text-sm text-(--ink-3)">Carregando locais cadastrados...</p>
            ) : (
              <p className="mt-1 text-sm text-(--ink-3)">
                {points.length} cadastrados, capacidade total de {totalCapacity} pessoas.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadPoints()}
            disabled={loading}
          >
            <RotateCcw />
            Atualizar
          </Button>
        </div>

        {feedback && <SupportPointsFeedback type={feedback.type} message={feedback.message} />}

        {loading ? (
          <AdminLoadingState message="Carregando locais..." />
        ) : points.length === 0 ? (
          <SupportPointsEmptyState onCreate={resetForm} />
        ) : (
          <SupportPointsTable
            points={points}
            editingId={editingPoint?.id}
            deletingId={deletingId}
            onEdit={startEditing}
            onDelete={(point) => void handleDelete(point)}
          />
        )}
      </section>

      <SupportPointForm
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
