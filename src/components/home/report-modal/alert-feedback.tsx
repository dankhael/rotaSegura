"use client";

import { useEffect } from "react";

type AlertFeedbackProps = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
};

export function AlertFeedback({ open, type, title, message, onClose }: AlertFeedbackProps) {
  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      onClose();
    }, 3200);

    return () => clearTimeout(timeout);
  }, [open, onClose]);

  if (!open) return null;

  const isSuccess = type === "success";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 28,
          padding: 26,
          background: "var(--surface)",
          border: isSuccess ? "2px solid rgba(0,220,140,0.22)" : "2px solid rgba(255,80,80,0.22)",
          boxShadow: isSuccess
            ? "0 20px 60px rgba(0,220,140,0.18)"
            : "0 20px 60px rgba(255,80,80,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* ICON */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              marginBottom: 18,
              background: isSuccess ? "rgba(0,220,140,0.12)" : "rgba(255,80,80,0.12)",
              boxShadow: isSuccess
                ? "0 16px 40px rgba(0,220,140,0.16)"
                : "0 16px 40px rgba(255,80,80,0.16)",
            }}
          >
            {isSuccess ? "✅" : "❌"}
          </div>

          {/* TITLE */}
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </h2>

          {/* MESSAGE */}
          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-3)",
              maxWidth: 300,
            }}
          >
            {message}
          </p>
        </div>

        {/* BUTTON */}
        <button
          onClick={onClose}
          style={{
            marginTop: 26,
            width: "100%",
            height: 50,
            borderRadius: 16,
            border: "none",
            background: isSuccess ? "rgb(0,200,120)" : "var(--emergency)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: isSuccess
              ? "0 10px 24px rgba(0,220,140,0.18)"
              : "0 10px 24px rgba(255,77,77,0.22)",
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
