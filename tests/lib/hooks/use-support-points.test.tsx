import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useSupportPoints } from "@/lib/hooks/use-support-points";
import { makeSupportPoint } from "../../factories/support-point";

type FetchStub = { ok: boolean; json: () => Promise<unknown> };

function stubFetch(result: FetchStub): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(result)),
  );
}

describe("useSupportPoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns support points from the API envelope", async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ data: [makeSupportPoint({ id: "a" })] }) });

    const { result } = renderHook(() => useSupportPoints());

    await waitFor(() => expect(result.current.supportPoints).toHaveLength(1));
    expect(result.current.hasError).toBe(false);
  });

  it("flags an error when the response is not ok", async () => {
    stubFetch({ ok: false, json: () => Promise.resolve({ error: "boom" }) });

    const { result } = renderHook(() => useSupportPoints());

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.supportPoints).toHaveLength(0);
  });
});
