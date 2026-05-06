import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useGeolocation } from "@/lib/hooks/use-geolocation";

type SuccessCb = (pos: GeolocationPosition) => void;
type ErrorCb = (err: GeolocationPositionError) => void;
type Coords = { lat: number; lng: number; accuracy?: number };

/**
 * Simulates navigator.geolocation. The hook drives everything off
 * watchPosition now, so the fake just captures the latest callbacks
 * and exposes emit helpers tests can call from inside `act`.
 */
class FakeGeolocation {
  private watchSuccess: SuccessCb | null = null;
  private watchError: ErrorCb | null = null;
  private nextId = 1;
  watchIds: number[] = [];
  cleared: number[] = [];

  watchPosition = vi.fn((success: SuccessCb, error: ErrorCb) => {
    this.watchSuccess = success;
    this.watchError = error;
    const id = this.nextId++;
    this.watchIds.push(id);
    return id;
  });

  getCurrentPosition = vi.fn();
  clearWatch = vi.fn((id: number) => this.cleared.push(id));

  emitFix(coords: Coords) {
    this.watchSuccess?.(buildPosition(coords));
  }

  emitError(code: number) {
    this.watchError?.(buildError(code));
  }
}

function buildPosition(c: Coords): GeolocationPosition {
  return {
    coords: {
      latitude: c.lat,
      longitude: c.lng,
      accuracy: c.accuracy ?? 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

function buildError(code: number): GeolocationPositionError {
  return {
    code,
    message: code === 1 ? "denied" : code === 3 ? "timeout" : "unavailable",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

let fake: FakeGeolocation;

beforeEach(() => {
  fake = new FakeGeolocation();
  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: fake,
  });
  // Default: IP fetch never resolves so it doesn't influence tests that
  // care about the device path. Tests can override per-case.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useGeolocation", () => {
  it("captures the first watch tick and reports granted device status", async () => {
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    act(() => fake.emitFix({ lat: -8.05, lng: -34.9, accuracy: 12 }));

    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(result.current.coords).toEqual({ lat: -8.05, lng: -34.9, accuracy: 12 });
    expect(result.current.source).toBe("device");
  });

  it("accepts subsequent watch ticks as movement updates even with worse accuracy", async () => {
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    act(() => fake.emitFix({ lat: 1, lng: 2, accuracy: 5 }));
    await waitFor(() => expect(result.current.coords?.lat).toBe(1));

    act(() => fake.emitFix({ lat: 3, lng: 4, accuracy: 25 }));
    await waitFor(() => expect(result.current.coords).toEqual({ lat: 3, lng: 4, accuracy: 25 }));
  });

  it("reports denied when permission is refused, without falling through to IP", async () => {
    const fetchSpy = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    act(() => fake.emitError(1));

    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(result.current.coords).toBeNull();
    expect(result.current.source).toBeNull();
    // Watch is cleared on denial so further ticks can't resurrect it.
    expect(fake.clearWatch).toHaveBeenCalledWith(fake.watchIds[0]);
  });

  it("falls back to IP geolocation when device watch errors out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          lat: 37.5,
          lng: -122.3,
          city: "Test City",
          country: "Testland",
          source: "geojs",
        }),
      })),
    );

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    act(() => fake.emitError(3)); // TIMEOUT

    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(result.current.source).toBe("ip");
    expect(result.current.coords).toEqual({
      lat: 37.5,
      lng: -122.3,
      accuracy: expect.any(Number),
    });
  });

  it("device fix overrides an earlier IP fix", async () => {
    let resolveIp: ((value: unknown) => void) | null = null;
    const fetchSpy = vi.fn(
      () =>
        new Promise((r) => {
          resolveIp = r;
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    await act(async () => {
      resolveIp?.({
        ok: true,
        status: 200,
        json: async () => ({ lat: 10, lng: 20, source: "geojs" }),
      });
    });
    await waitFor(() => expect(result.current.source).toBe("ip"));

    act(() => fake.emitFix({ lat: -8, lng: -34, accuracy: 8 }));
    await waitFor(() => expect(result.current.source).toBe("device"));
    expect(result.current.coords).toEqual({ lat: -8, lng: -34, accuracy: 8 });
  });

  it("reports unavailable when device errors and IP fallback also fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    act(() => fake.emitError(3));

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.coords).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it("clears the watch on unmount", async () => {
    const { unmount } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalled());

    const watchId = fake.watchIds[0];
    unmount();

    expect(fake.clearWatch).toHaveBeenCalledWith(watchId);
  });

  it("retry restarts the watch and clears the prior one", async () => {
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(fake.watchPosition).toHaveBeenCalledTimes(1));

    act(() => fake.emitFix({ lat: 1, lng: 2, accuracy: 10 }));
    await waitFor(() => expect(result.current.status).toBe("granted"));

    const firstWatch = fake.watchIds[0];
    act(() => result.current.retry());

    expect(fake.watchPosition).toHaveBeenCalledTimes(2);
    expect(fake.clearWatch).toHaveBeenCalledWith(firstWatch);
  });
});
