"use client";

import { useCallback, useEffect, useState } from "react";

import { getDeviceId } from "@/lib/device/device-id";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import {
  getPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications/client";

type Status = "loading" | "unsupported" | "idle" | "granted" | "denied" | "subscribing" | "error";

type PushPermissionCardProps = {
  vapidPublicKey: string | undefined;
};

// Card que pede permissão de notificação e mantém o estado visível ao usuário.
// AC-01/02/03/07: prompt claro, opt-in/opt-out reversível, falha graciosa
// quando o usuário nega (sem reabrir a janela na mesma sessão).
export function PushPermissionCard({ vapidPublicKey }: PushPermissionCardProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const geo = useGeolocation();

  useEffect(() => {
    // SSR boot é "loading"; resolvemos pra um estado terminal pós-mount.
    // Mesmo padrão usado em use-geolocation.ts.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isPushSupported() || !vapidPublicKey) {
      setStatus("unsupported");
      return;
    }
    const perm = getPermission();
    if (perm === "granted") setStatus("granted");
    else if (perm === "denied") setStatus("denied");
    else setStatus("idle");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [vapidPublicKey]);

  const handleEnable = useCallback(async () => {
    if (!vapidPublicKey) return;
    if (!geo.coords) {
      setError("Aguarde detectar sua localização para receber alertas próximos");
      return;
    }
    setStatus("subscribing");
    setError(null);
    const result = await subscribeToPush({
      vapidPublicKey,
      deviceId: getDeviceId(),
      latitude: geo.coords.lat,
      longitude: geo.coords.lng,
    });
    if (result.ok) {
      setStatus("granted");
      return;
    }
    if (result.reason === "permission-denied") setStatus("denied");
    else if (result.reason === "unsupported") setStatus("unsupported");
    else {
      setStatus("error");
      setError(reasonToMessage(result.reason));
    }
  }, [geo.coords, vapidPublicKey]);

  const handleDisable = useCallback(async () => {
    await unsubscribeFromPush();
    setStatus("idle");
  }, []);

  if (status === "unsupported" || status === "denied") return null;
  if (status === "granted") {
    return (
      <CardShell tone="ok">
        <strong>Alertas ativados.</strong>
        <p style={{ fontSize: 13, marginTop: 4, color: "var(--ink-3)" }}>
          Você receberá uma notificação quando uma ocorrência for registrada perto de você.
        </p>
        <button type="button" onClick={handleDisable} style={linkButtonStyle}>
          Desativar
        </button>
      </CardShell>
    );
  }

  return (
    <CardShell tone="info">
      <strong>Receba alertas próximos</strong>
      <p style={{ fontSize: 13, marginTop: 4, color: "var(--ink-3)" }}>
        Avisamos quando uma ocorrência for reportada perto de você, mesmo com o app fechado.
      </p>
      {error && (
        <p style={{ fontSize: 12, marginTop: 6, color: "var(--emergency)" }} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === "subscribing" || status === "loading"}
        style={primaryButtonStyle}
      >
        {status === "subscribing" ? "Ativando..." : "Ativar notificações"}
      </button>
    </CardShell>
  );
}

function reasonToMessage(reason: string): string {
  if (reason === "no-device-id") return "Não foi possível identificar o dispositivo";
  if (reason === "network") return "Falha de rede ao registrar; tente novamente";
  return "Não foi possível ativar notificações";
}

function CardShell({ tone, children }: { tone: "info" | "ok"; children: React.ReactNode }) {
  const bg = tone === "ok" ? "var(--ok-soft, #e7f5ee)" : "var(--surface)";
  const border =
    tone === "ok" ? "color-mix(in oklab, var(--ok, #138a4a) 25%, var(--line))" : "var(--line)";
  return (
    <div
      style={{
        padding: 14,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "8px 14px",
  borderRadius: 8,
  background: "var(--accent, #2563eb)",
  color: "white",
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 0,
  background: "transparent",
  color: "var(--ink-3)",
  fontSize: 12,
  textDecoration: "underline",
  border: "none",
  cursor: "pointer",
};
