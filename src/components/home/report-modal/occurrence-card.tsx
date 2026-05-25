type OccurrenceCardProps = {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
};

export function OccurrenceCard({ label, icon, active, onClick }: OccurrenceCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,

        padding: "18px 12px",

        borderRadius: 18,

        border: active ? "2px solid var(--emergency)" : "2px solid rgba(255,255,255,0.08)",

        background: active ? "rgba(255,77,77,0.12)" : "var(--surface)",

        color: "var(--ink)",

        cursor: "pointer",

        transition: "all 0.2s ease",

        boxShadow: active ? "0 10px 24px rgba(255,77,77,0.18)" : "0 4px 12px rgba(0,0,0,0.10)",
      }}
    >
      <span
        style={{
          fontSize: 26,
        }}
      >
        {icon}
      </span>

      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </button>
  );
}
