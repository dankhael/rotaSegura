type ModalButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export function ModalButton({
  label,
  onClick,
  variant = "primary",
  disabled = false,
}: ModalButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 46,
        borderRadius: 14,

        border: isPrimary ? "none" : "2px solid rgba(255,255,255,0.12)",

        background: isPrimary ? (disabled ? "#999" : "var(--emergency)") : "rgba(255,255,255,0.03)",

        color: isPrimary ? "#fff" : "var(--ink)",

        fontWeight: 700,

        cursor: disabled ? "not-allowed" : "pointer",

        transition: "0.2s",

        boxShadow: isPrimary
          ? disabled
            ? "none"
            : "0 10px 24px rgba(255,77,77,0.28)"
          : "0 4px 14px rgba(0,0,0,0.16)",
      }}
    >
      {label}
    </button>
  );
}
