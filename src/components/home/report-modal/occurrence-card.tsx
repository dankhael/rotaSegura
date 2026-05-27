type OccurrenceCardProps = {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
};

export function OccurrenceCard({ label, icon, active, onClick }: OccurrenceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Selecionar ocorrência: ${label}`}
      className={`
        flex flex-col items-center justify-center gap-2
        px-4 py-5
        rounded-xl
        border
        cursor-pointer
        transition-all duration-200
        shadow-sm
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-emergency
        focus-visible:ring-offset-2
        focus-visible:ring-offset-background
        hover:shadow-md
        active:scale-[0.98]
      `}
      style={{
        borderColor: active ? "var(--emergency)" : "rgba(255,255,255,0.08)",
        background: active ? "rgba(255,77,77,0.12)" : "var(--surface)",
        boxShadow: active ? "0 10px 24px rgba(255,77,77,0.18)" : "0 4px 12px rgba(0,0,0,0.10)",
        color: "var(--ink)",
      }}
    >
      <span className="text-2xl leading-none">{icon}</span>

      <span className="text-[13px] font-semibold text-center">{label}</span>

      {/* acessibilidade extra (screen reader only) */}
      <span className="sr-only">Tipo de ocorrência {label}</span>
    </button>
  );
}
