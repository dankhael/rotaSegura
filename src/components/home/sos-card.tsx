type SosCardProps = {
  onOpenReport: () => void;
};

export function SosCard({ onOpenReport }: SosCardProps) {
  return (
    <div
      className="p-4.5"
      style={{
        padding: 18,
        background: "linear-gradient(170deg, var(--surface) 0%, var(--emergency-soft) 200%)",
        border: "1px solid color-mix(in oklab, var(--emergency) 25%, var(--line))",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="uppercase font-bold flex items-center gap-1.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--emergency-ink)",
        }}
      >
        <span
          aria-hidden
          className="rs-sos-pulse"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--emergency)",
          }}
        />
        Reportar emergência
      </div>
      <div className="mt-2 font-bold" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>
        Você precisa reportar algo?
      </div>
      <p className="mt-1 leading-snug" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        Avise sobre um alagamento, área de risco, pessoa em perigo ou abrigo lotado. Sua informação
        ajuda a Defesa Civil a agir.
      </p>

      <button
        type="button"
        className="mt-3.5 w-full py-3.5 font-bold text-[15px] flex items-center justify-center gap-2 transition-transform"
        onClick={onOpenReport}
        style={{
          background: "var(--emergency)",
          color: "white",
          borderRadius: 12,
          letterSpacing: "-0.01em",
          boxShadow: "0 8px 20px -8px color-mix(in oklab, var(--emergency) 60%, transparent)",
          cursor: "pointer",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Reportar ocorrência
      </button>

      <button
        type="button"
        className="mt-2 w-full py-2.5 font-semibold text-[13px] flex items-center justify-center gap-1.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          color: "var(--ink-2)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Ligar 199 — Defesa Civil
      </button>
    </div>
  );
}
