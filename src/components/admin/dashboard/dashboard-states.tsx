// Estados auxiliares do dashboard (US10, AC7 e AC8): loading, erro com
// "tentar novamente" e vazio. Mantidos juntos por serem variações do mesmo
// painel de feedback e compartilharem o mesmo enquadramento visual.

function FeedbackFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid place-items-center px-6 py-16 text-center"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
      }}
    >
      {children}
    </div>
  );
}

export function DashboardLoading() {
  return (
    <FeedbackFrame>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent"
          style={{ color: "var(--ink-4)" }}
        />
        <span style={{ fontSize: 14, color: "var(--ink-3)" }}>Carregando resumo…</span>
      </div>
    </FeedbackFrame>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <FeedbackFrame>
      <div role="alert" className="flex flex-col items-center gap-3">
        <p className="font-semibold" style={{ fontSize: 15, color: "var(--ink-2)" }}>
          Não foi possível carregar o resumo.
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
          Verifique sua conexão e tente novamente.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold transition-colors"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface)",
            color: "var(--ink-2)",
          }}
        >
          Tentar novamente
        </button>
      </div>
    </FeedbackFrame>
  );
}

export function DashboardEmpty() {
  return (
    <FeedbackFrame>
      <div>
        <p className="font-semibold" style={{ fontSize: 15, color: "var(--ink-2)" }}>
          Nenhuma ocorrência encontrada
        </p>
        <p className="mt-1" style={{ fontSize: 13, color: "var(--ink-3)" }}>
          Ajuste ou limpe os filtros para ver outras ocorrências.
        </p>
      </div>
    </FeedbackFrame>
  );
}
