"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getAddressFromCoords } from "@/lib/geocoding/getAddressFromCoords";
import { apiEndpoints } from "@/lib/api/endpoints";
import { getDeviceId } from "@/lib/device/device-id";
import type { OccurrenceType } from "@/lib/validations/occurrence";

import { OccurrenceCard } from "./occurrence-card";
import { ModalButton } from "./modal-button";
import { ModalConfirm } from "./modal-confirm";
import { AlertFeedback } from "./alert-feedback";

type Step = "form" | "confirm";

type FeedbackState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ReportModal({ open, onClose }: ReportModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [selected, setSelected] = useState<OccurrenceType | null>(null);
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const [occurredAt] = useState(() => new Date().toISOString());

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const { coords, status, retry } = useGeolocation();

  function resetModal() {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setStep("form");
    setSelected(null);
    setAddress("");
    setIsSubmitting(false);
  }

  useEffect(() => {
    if (!open) return;

    return () => {
      resetModal();
    };
  }, [open]);

  // Só geocodifica com o modal aberto e cancela a request anterior quando coords
  // muda (o GPS refina a posição várias vezes), evitando chamadas órfãs ao Nominatim.
  useEffect(() => {
    if (!open || !coords) return;

    const controller = new AbortController();
    getAddressFromCoords(coords.lat, coords.lng, controller.signal).then((result) => {
      if (!controller.signal.aborted) setAddress(result);
    });

    return () => controller.abort();
  }, [open, coords]);

  function handleClose() {
    resetModal();
    onClose();
  }

  async function handleConfirm() {
    if (!selected || !coords) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsSubmitting(true);

    try {
      const deviceId = getDeviceId();
      const response = await fetch(apiEndpoints.reports, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          type: selected,
          latitude: coords.lat,
          longitude: coords.lng,
          occurredAt,
          ...(deviceId ? { deviceId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`POST ${apiEndpoints.reports} respondeu ${response.status}`);
      }

      // 200 = relato idempotente (deviceId já registrado nessa ocorrência); 201 = novo.
      const alreadyReported = response.status === 200;

      setFeedback({
        open: true,
        type: "success",
        title: alreadyReported ? "Você já reportou esse evento" : "Ocorrência enviada",
        message: alreadyReported
          ? "Seu relato já estava contabilizado para esta ocorrência."
          : "Sua ocorrência foi registrada com sucesso.",
      });

      resetModal();
      onClose();
    } catch (err) {
      // Fechar o modal durante o envio aborta a request — não é erro do usuário.
      if (err instanceof DOMException && err.name === "AbortError") return;

      console.error("[POST /api/reports]", err);
      setFeedback({
        open: true,
        type: "error",
        title: "Erro ao enviar",
        message: "Não foi possível registrar a ocorrência.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const options: {
    label: string;
    value: OccurrenceType;
    icon: string;
  }[] = [
    { value: "FLOOD", label: "Alagamento", icon: "🌊" },
    { value: "FIRE", label: "Incêndio", icon: "🔥" },
    { value: "LANDSLIDE", label: "Deslizamento", icon: "⛰️" },
    { value: "ACCIDENT", label: "Acidente", icon: "🚑" },
    { value: "OBSTRUCTION", label: "Obstrução", icon: "🚧" },
    { value: "OTHER", label: "Outro", icon: "📍" },
  ];

  const selectedOption = options.find((o) => o.value === selected);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          aria-labelledby="report-title"
          aria-describedby="report-desc"
          className="
            w-[95vw]
            max-w-225
            sm:max-w-245
            max-h-[90vh]
            overflow-y-auto
            p-8
            rounded-xl
            z-9999
          "
        >
          {/* FORM */}
          {step === "form" && (
            <>
              <div className="text-center space-y-2 mb-4">
                <h2 id="report-title" className="text-xl font-bold">
                  Reportar ocorrência
                </h2>

                <p id="report-desc" className="text-sm text-muted-foreground">
                  Selecione o tipo da ocorrência
                </p>
              </div>
              <div
                role="group"
                aria-label="Tipos de ocorrência"
                className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6"
              >
                {options.map((opt) => (
                  <OccurrenceCard
                    key={opt.value}
                    label={opt.label}
                    icon={opt.icon}
                    active={selected === opt.value}
                    onClick={() => setSelected((prev) => (prev === opt.value ? null : opt.value))}
                  />
                ))}
              </div>

              {!coords && status === "prompting" && (
                <p className="mt-4 text-sm text-center text-(--ink-3)">Obtendo sua localização…</p>
              )}

              {!coords && (status === "denied" || status === "unavailable") && (
                <p className="mt-4 text-sm text-center text-(--emergency)">
                  Não foi possível obter sua localização.{" "}
                  <button type="button" onClick={retry} className="underline font-semibold">
                    Tentar novamente
                  </button>
                </p>
              )}

              <div className="flex gap-3 mt-8">
                <ModalButton label="Cancelar" variant="secondary" onClick={handleClose} />

                <ModalButton
                  label="Continuar"
                  variant="primary"
                  disabled={!selected || !coords}
                  onClick={() => setStep("confirm")}
                />
              </div>
            </>
          )}

          {/* CONFIRM */}
          {step === "confirm" && (
            <ModalConfirm
              occurrenceLabel={selectedOption?.label || "Nenhuma"}
              occurrenceIcon={selectedOption?.icon || "📍"}
              address={address || "Obtendo endereço..."}
              occurredAt={new Date(occurredAt).toLocaleString("pt-BR")}
              isSubmitting={isSubmitting}
              onBack={() => setStep("form")}
              onConfirm={handleConfirm}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertFeedback
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
