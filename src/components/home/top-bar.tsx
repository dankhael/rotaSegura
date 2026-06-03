import Link from "next/link";

export function TopBar() {
  return (
    <header
      className="flex items-center gap-4 px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="flex items-center gap-2.5 pr-4"
        style={{ borderRight: "1px solid var(--line)" }}
      >
        <div
          className="grid place-items-center relative overflow-hidden"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--ink)",
            color: "white",
          }}
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6 Z" />
            <path d="M9 12 L11 14 L15 10" />
          </svg>
        </div>
        <div>
          <div className="text-base font-bold tracking-tight">Rota Segura</div>
          <div
            className="uppercase font-medium"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.02em",
            }}
          >
            Defesa Civil
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Link href="/login">
          <button
            type="button"
            aria-label="Entrar"
            title="Entrar"
            className="
              flex items-center justify-center gap-2
              h-10 px-4
              rounded-xl
              border border-white/10
              bg-white/5
              text-sm font-semibold
              text-(--ink)
              backdrop-blur-md
              shadow-sm
              transition-all duration-200
              hover:bg-white/10
              hover:shadow-md
              active:scale-[0.98]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-emergency
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
            "
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
              className="shrink-0"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>

            <span>Entrar</span>
          </button>
        </Link>
        <button
          type="button"
          aria-label="Ajuda"
          title="Ajuda"
          className="grid place-items-center transition-colors"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid var(--line)",
            color: "var(--ink-2)",
            background: "var(--surface)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </header>
  );
}
