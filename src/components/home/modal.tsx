type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 880,
          background: "var(--surface)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        {title && <h2 style={{ fontWeight: 700 }}>{title}</h2>}
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    </div>
  );
}
