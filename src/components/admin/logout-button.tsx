"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Encerra a sessão admin: chama `POST /api/auth/logout` (que apaga o cookie
 * httpOnly) e leva o usuário de volta para `/login`. Mesmo em caso de erro no
 * fetch, redireciona — o pior cenário é cookie ainda válido, e o middleware
 * volta a barrar quando o usuário tentar `/admin` de novo.
 */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignora erro de rede; segue para /login mesmo assim.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-busy={loading}
      className="
        inline-flex items-center gap-2
        h-10 px-4
        rounded-xl
        border
        text-sm font-semibold
        transition-colors
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
      style={{
        borderColor: "var(--line)",
        background: "var(--surface)",
        color: "var(--ink-2)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
