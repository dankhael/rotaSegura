type InfoRowProps = {
  label: string;
  value: string;
  icon: string;
};

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 18,
          boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            marginBottom: 4,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
