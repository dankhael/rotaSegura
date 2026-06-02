type Props = {
  type: "success" | "error";
  message: string;
};

// Cada variante tem cor própria para que sucesso e erro sejam distinguíveis
// sem depender do texto (requisito "feedback visual de sucesso e erro").
const TONE: Record<Props["type"], string> = {
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

export function FeedbackAlert({ type, message }: Props) {
  return (
    <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${TONE[type]}`}>
      {message}
    </div>
  );
}
