import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import { buildSummaryQuery, useOccurrenceSummary } from "@/lib/hooks/use-occurrence-summary";
import { makeSummary } from "../../factories/occurrence-summary";

const SUMMARY = makeSummary();

type FetchResult = { ok: boolean; json: () => Promise<unknown> };

function stubFetchSequence(results: FetchResult[]): ReturnType<typeof vi.fn> {
  let last = results[results.length - 1];
  const fetchMock = vi.fn(() => {
    if (results.length > 0) last = results.shift() as FetchResult;
    return Promise.resolve(last);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("buildSummaryQuery", () => {
  it("omite a query quando não há filtros", () => {
    expect(buildSummaryQuery({})).toBe("/api/occurrences/summary");
  });

  it("inclui tipo, status e período quando presentes", () => {
    expect(buildSummaryQuery({ type: "FLOOD", status: "PENDING", period: "30d" })).toBe(
      "/api/occurrences/summary?type=FLOOD&status=PENDING&period=30d",
    );
  });
});

describe("useOccurrenceSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("entrega o resumo quando a resposta é ok", async () => {
    stubFetchSequence([{ ok: true, json: () => Promise.resolve(SUMMARY) }]);

    const { result } = renderHook(() => useOccurrenceSummary({ period: "7d" }));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toEqual({ status: "ready", summary: SUMMARY });
  });

  it("sinaliza erro quando a resposta não é ok", async () => {
    stubFetchSequence([{ ok: false, json: () => Promise.resolve({}) }]);

    const { result } = renderHook(() => useOccurrenceSummary({ period: "7d" }));

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("reload recupera após erro", async () => {
    stubFetchSequence([
      { ok: false, json: () => Promise.resolve({}) },
      { ok: true, json: () => Promise.resolve(SUMMARY) },
    ]);

    const { result } = renderHook(() => useOccurrenceSummary({ period: "7d" }));
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  it("inclui o período na URL da busca", async () => {
    const fetchMock = stubFetchSequence([{ ok: true, json: () => Promise.resolve(SUMMARY) }]);

    renderHook(() => useOccurrenceSummary({ period: "30d" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/occurrences/summary?period=30d");
  });

  it("sinaliza isRefreshing durante um reload em background", async () => {
    let resolveSecond: (value: FetchResult) => void = () => {};
    const secondFetch = new Promise<FetchResult>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SUMMARY) })
      .mockReturnValueOnce(secondFetch);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOccurrenceSummary({ period: "7d" }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.isRefreshing).toBe(false);

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));

    // Dados antigos continuam visíveis enquanto atualiza.
    expect(result.current.state.status).toBe("ready");

    await act(async () => {
      resolveSecond({ ok: true, json: () => Promise.resolve(SUMMARY) });
    });
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });
});
