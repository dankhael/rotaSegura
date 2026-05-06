"use client";

import { useState } from "react";

export function AlertBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className="mt-3.5 flex items-center gap-3.5 px-4 py-3.5 relative overflow-hidden"
      style={{
        background: "var(--warn-soft)",
        border: "1px solid color-mix(in oklab, var(--warn) 30%, var(--line))",
        borderRadius: "var(--r-lg)",
        color: "var(--warn-ink)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "var(--warn)",
        }}
      />
      <div
        className="grid place-items-center shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--warn)",
          color: "white",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm tracking-tight">
          Alerta de chuvas intensas — Recife e Região Metropolitana
        </div>
        <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-2)" }}>
          Risco de alagamentos até 22h. Evite áreas baixas. Atualizado há 8 minutos pela Defesa
          Civil.
        </div>
      </div>
      <button
        type="button"
        className="px-3.5 py-2 font-semibold text-[13px]"
        style={{
          background: "var(--ink)",
          color: "white",
          borderRadius: 8,
        }}
      >
        Ver detalhes
      </button>
      <button
        type="button"
        aria-label="Fechar alerta"
        onClick={() => setVisible(false)}
        className="grid place-items-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          color: "var(--warn-ink)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
