import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useOccurrences } from "@/lib/hooks/use-occurrences";
import { makeOccurrence } from "../../factories/occurrence";

type FetchStub = { ok: boolean; json: () => Promise<unknown> };

function stubFetch(result: FetchStub): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(result)),
  );
}

describe("useOccurrences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns occurrences from the API envelope", async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ data: [makeOccurrence({ id: "a" })] }) });

    const { result } = renderHook(() => useOccurrences());

    await waitFor(() => expect(result.current.occurrences).toHaveLength(1));
    expect(result.current.hasError).toBe(false);
  });

  it("flags an error when the response is not ok", async () => {
    stubFetch({ ok: false, json: () => Promise.resolve({ error: "boom" }) });

    const { result } = renderHook(() => useOccurrences());

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.occurrences).toHaveLength(0);
  });

  it("treats a malformed envelope as empty without erroring", async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ error: "oops" }) });

    const { result } = renderHook(() => useOccurrences());

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.occurrences).toHaveLength(0);
    expect(result.current.hasError).toBe(false);
  });
});
