type AdminFeedbackProps = {
  type: "success" | "error";
  message: string;
};

export function AdminFeedback({ type, message }: AdminFeedbackProps) {
  return (
    <div
      role="alert"
      className={
        type === "success"
          ? "m-4 rounded-lg border border-(--safe)/30 bg-(--safe-soft) px-4 py-3 text-sm font-medium text-(--safe-ink)"
          : "m-4 rounded-lg border border-(--emergency)/30 bg-(--emergency-soft) px-4 py-3 text-sm font-medium text-(--emergency-ink)"
      }
    >
      {message}
    </div>
  );
}
