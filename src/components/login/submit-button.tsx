"use client";

type Props = {
  loading: boolean;
};

export function SubmitButton({ loading }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        mt-2
        h-13
        rounded-2xl
        font-bold
        text-white
        transition-all
      "
      style={{
        background: "var(--emergency)",
      }}
    >
      {loading ? "Entrando..." : "Entrar"}
    </button>
  );
}
