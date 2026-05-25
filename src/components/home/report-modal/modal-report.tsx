"use client";

import { useEffect, useState } from "react";
import { Modal } from "../modal";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { getAddressFromCoords } from "@/lib/geocoding/getAddressFromCoords";
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

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const { coords, retry } = useGeolocation();

  useEffect(() => {
    if (open) {
      retry();
    }
  }, [open, retry]);

  useEffect(() => {
    if (!coords) return;

    getAddressFromCoords(coords.lat, coords.lng).then(setAddress);
  }, [coords]);

  function toggleOption(option: OccurrenceType) {
    setSelected((prev) => (prev === option ? null : option));
  }

  function handleClose() {
    setStep("form");

    setSelected(null);

    setAddress("");

    setIsSubmitting(false);

    onClose();
  }

  async function handleConfirmSend() {
    if (!selected || !coords) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/occurrences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selected,
          latitude: coords.lat,
          longitude: coords.lng,
          occurredAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar ocorrência");
      }

      handleClose();

      setFeedback({
        open: true,
        type: "success",
        title: "Ocorrência enviada",
        message: "A ocorrência foi registrada com sucesso.",
      });
    } catch (error) {
      console.error(error);

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
    {
      value: "FLOOD",
      label: "Alagamento",
      icon: "🌊",
    },
    {
      value: "FIRE",
      label: "Incêndio",
      icon: "🔥",
    },
    {
      value: "LANDSLIDE",
      label: "Deslizamento",
      icon: "⛰️",
    },
    {
      value: "ACCIDENT",
      label: "Acidente",
      icon: "🚑",
    },
    {
      value: "OBSTRUCTION",
      label: "Obstrução",
      icon: "🚧",
    },
    {
      value: "OTHER",
      label: "Outro",
      icon: "📍",
    },
  ];

  const selectedOption = options.find((o) => o.value === selected);

  return (
    <>
      <Modal open={open} onClose={handleClose} title="">
        {/* ================= FORM ================= */}

        {step === "form" && (
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
                  background:
                    "linear-gradient(135deg, var(--emergency-soft), rgba(255,255,255,0.08))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: "0 10px 30px rgba(255,77,77,0.18)",
                }}
              >
                🚨
              </div>

              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Reportar ocorrência
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-3)",
                }}
              >
                Selecione o tipo da ocorrência
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {options.map((opt) => (
                <OccurrenceCard
                  key={opt.value}
                  label={opt.label}
                  icon={opt.icon}
                  active={selected === opt.value}
                  onClick={() => toggleOption(opt.value)}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 24,
              }}
            >
              <ModalButton label="Cancelar" variant="secondary" onClick={handleClose} />

              <ModalButton
                label="Continuar"
                variant="primary"
                disabled={!selected}
                onClick={() => setStep("confirm")}
              />
            </div>
          </>
        )}

        {/* ================= CONFIRM ================= */}

        {step === "confirm" && (
          <ModalConfirm
            occurrenceLabel={selectedOption?.label || "Nenhuma"}
            occurrenceIcon={selectedOption?.icon || "📍"}
            address={address || "Obtendo endereço..."}
            occurredAt={new Date().toLocaleString("pt-BR")}
            isSubmitting={isSubmitting}
            onBack={() => setStep("form")}
            onConfirm={handleConfirmSend}
          />
        )}
      </Modal>

      <AlertFeedback
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() =>
          setFeedback((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </>
  );
}
