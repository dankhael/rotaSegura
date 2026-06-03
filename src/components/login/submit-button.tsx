"use client";

type Props = {
  loading: boolean;
};

/**
 * Botão primário do formulário de login. Usa o token `--ink` (mesma paleta da
 * ação primária do `MapCard`) — `--emergency` é reservado para SOS e passava
 * a leitura semântica errada num botão de "Entrar".
 */
export function SubmitButton({ loading }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="
        mt-2
        h-13
        rounded-2xl
        font-bold
        text-white
        transition-all
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
      style={{
        // --ink é o token de ação primária; --emergency é reservado p/ SOS.
        background: "var(--ink)",
      }}
    >
      {loading ? "Entrando..." : "Entrar"}
    </button>
  );
}
