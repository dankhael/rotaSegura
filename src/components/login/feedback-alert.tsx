type Props = {
  type: "success" | "error";
  message: string;
};

export function FeedbackAlert({ message }: Props) {
  return (
    <div
      className="
        rounded-2xl
        border
        px-4
        py-3
        text-sm
        font-medium
      "
    >
      {message}
    </div>
  );
}
