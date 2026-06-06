import { useCallback, useEffect, useState } from "react";

import type { OccurrenceSummary, OccurrenceSummaryFilters } from "@/types/occurrence-summary";

export type SummaryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; summary: OccurrenceSummary };

// Repete a busca em background para o selo "Dados ao vivo".
const LIVE_REFRESH_MS = 60_000;

export function buildSummaryQuery(filters: OccurrenceSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.period) params.set("period", filters.period);
  const query = params.toString();
  return query ? `/api/occurrences/summary?${query}` : "/api/occurrences/summary";
}

async function fetchSummary(path: string, signal: AbortSignal): Promise<OccurrenceSummary> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new Error(`Falha ao buscar resumo: HTTP ${response.status}`);
  }
  return (await response.json()) as OccurrenceSummary;
}

/**
 * Busca o resumo do dashboard admin (US10 v2), refazendo quando os filtros/
 * período mudam. Stale-while-revalidate: só mostra o skeleton de loading no 1º
 * carregamento e quando os filtros mudam (dataset novo); `reload` e o refresh
 * automático de 60s atualizam em background mantendo os dados na tela.
 *
 * @example const { state, reload } = useOccurrenceSummary({ period: "7d" });
 */
export function useOccurrenceSummary(filters: OccurrenceSummaryFilters): {
  state: SummaryState;
  reload: () => void;
  isRefreshing: boolean;
} {
  const [result, setResult] = useState<{ path: string; summary: OccurrenceSummary } | null>(null);
  const [errored, setErrored] = useState(false);
  const [settledToken, setSettledToken] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const path = buildSummaryQuery(filters);
  // Identifica a busca atual (filtros + contador de refresh); ao assentar,
  // gravamos este token para saber quando uma atualização terminou.
  const token = `${path}#${tick}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchSummary(path, controller.signal)
      .then((summary) => {
        setResult({ path, summary });
        setErrored(false);
        setSettledToken(token);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrored(true);
        setSettledToken(token);
      });

    return () => controller.abort();
  }, [path, token]);

  // Refresh em background; o `tick` dispara o effect sem trocar o `path`, então
  // os dados atuais continuam visíveis (sem flash de skeleton).
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const hasFreshData = result?.path === path;
  const state: SummaryState = hasFreshData
    ? { status: "ready", summary: result.summary }
    : errored
      ? { status: "error" }
      : { status: "loading" };

  // Refazendo em background (Atualizar/refresh de 60s) enquanto já há dados:
  // a busca atual ainda não assentou. Vira feedback do botão "Atualizar".
  const isRefreshing = hasFreshData && settledToken !== token;

  return { state, reload, isRefreshing };
}
