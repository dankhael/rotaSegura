"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationCoords = { lat: number; lng: number; accuracy: number };
export type GeolocationSource = "device" | "ip";

export type GeolocationStatus = "idle" | "prompting" | "granted" | "denied" | "unavailable";

export type GeolocationState = {
  coords: GeolocationCoords | null;
  source: GeolocationSource | null;
  status: GeolocationStatus;
  error: string | null;
  /** Re-runs the lookup. Wire this to a "locate me" button. */
  retry: () => void;
};

type InternalState = Omit<GeolocationState, "retry">;

/**
 * Single watchPosition call with high-accuracy enabled. The browser
 * delivers progressively better fixes (cell tower → WiFi → GPS) so a
 * separate getCurrentPosition pre-warm is unnecessary — the first watch
 * tick is roughly as fast as a low-accuracy point query, and subsequent
 * ticks refine it.
 */
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 30_000,
};

const IP_GEOLOCATE_URL = "/api/geolocate";
const IP_ACCURACY_METERS = 50_000;
const TAG = "[geo]";

type LogDetail = Record<string, unknown> | object | string;

function logInfo(event: string, detail?: LogDetail) {
  if (typeof console === "undefined") return;
  if (detail !== undefined) console.log(TAG, event, detail);
  else console.log(TAG, event);
}

function logWarn(event: string, detail?: LogDetail) {
  if (typeof console === "undefined") return;
  if (detail !== undefined) console.warn(TAG, event, detail);
  else console.warn(TAG, event);
}

type GeolocateRouteResponse = {
  lat?: number;
  lng?: number;
  city?: string | null;
  country?: string | null;
  source?: string;
  error?: string;
  failures?: string[];
};

async function fetchIpFix(signal: AbortSignal): Promise<GeolocationCoords | null> {
  try {
    const res = await fetch(IP_GEOLOCATE_URL, { signal, cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as GeolocateRouteResponse;
    if (!res.ok || typeof data.lat !== "number" || typeof data.lng !== "number") {
      logWarn("ip-fallback failed", {
        status: res.status,
        failures: data.failures,
      });
      return null;
    }
    logInfo("ip-fallback resolved", {
      provider: data.source,
      city: data.city,
      country: data.country,
    });
    return { lat: data.lat, lng: data.lng, accuracy: IP_ACCURACY_METERS };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    logWarn("ip-fallback error", { err: String(err) });
    return null;
  }
}

/**
 * Reads the user's current position by running a single high-accuracy
 * watchPosition and an IP-based fallback in parallel. The first source
 * to deliver wins; device fixes always replace IP (so movement updates
 * land correctly), and IP only seeds when nothing else has. If the user
 * denies permission, the IP fallback is aborted to respect that choice.
 *
 * @example
 *   const { coords, source, status, retry } = useGeolocation();
 *   if (status === "denied") return <button onClick={retry}>Tentar de novo</button>;
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<InternalState>({
    coords: null,
    source: null,
    status: "idle",
    error: null,
  });

  // Each requestFix call captures a version. Callbacks from prior runs
  // (stale IP fetches, watch ticks for the previous watchId) check this
  // and bail, so cancellation is implicit rather than tracked per-source.
  const versionRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const ipAbortRef = useRef<AbortController | null>(null);

  const requestFix = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      logWarn("navigator.geolocation unavailable");
      return;
    }

    const myVersion = ++versionRef.current;
    const isStale = () => myVersion !== versionRef.current;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    ipAbortRef.current?.abort();
    const ipAbort = new AbortController();
    ipAbortRef.current = ipAbort;

    setState({ coords: null, source: null, status: "prompting", error: null });

    let ipResolved = false;
    let ipSucceeded = false;
    let deviceFailed = false;
    let denied = false;
    let lastReason = "";

    // Best-source-wins reducer. Device fixes always overwrite (movement
    // updates would otherwise be ignored as accuracy fluctuates); IP only
    // seeds when nothing is set, so a slow IP response can't clobber GPS.
    const acceptFix = (coords: GeolocationCoords, source: GeolocationSource) => {
      if (isStale()) return;
      logInfo(`fix [${source}]`, coords);
      setState((prev) => {
        if (source === "device") {
          return { coords, source: "device", status: "granted", error: null };
        }
        if (prev.coords) return prev;
        return { coords, source: "ip", status: "granted", error: null };
      });
    };

    const settleStatus = () => {
      if (isStale()) return;
      setState((prev) => {
        if (prev.coords) return prev;
        if (denied) return { ...prev, status: "denied", error: lastReason };
        if (deviceFailed && ipResolved && !ipSucceeded) {
          return { ...prev, status: "unavailable", error: lastReason };
        }
        return prev;
      });
    };

    logInfo("ip-fallback start");
    void fetchIpFix(ipAbort.signal).then((coords) => {
      ipResolved = true;
      if (denied) return; // privacy: don't backfill an explicit denial
      if (coords) {
        ipSucceeded = true;
        acceptFix(coords, "ip");
      } else {
        settleStatus();
      }
    });

    logInfo("watch start", WATCH_OPTIONS);
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        acceptFix(
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          "device",
        ),
      (err) => {
        if (isStale()) return;
        const detail = `code ${err.code}: ${err.message || "unknown"}`;
        lastReason = detail;
        if (err.code === err.PERMISSION_DENIED) {
          logWarn("device denied", detail);
          denied = true;
          ipAbort.abort();
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setState({ coords: null, source: null, status: "denied", error: detail });
          return;
        }
        // TIMEOUT or POSITION_UNAVAILABLE — keep the watch alive (browser
        // may still recover) but flag it so settleStatus can move on.
        logWarn("device error", detail);
        deviceFailed = true;
        settleStatus();
      },
      WATCH_OPTIONS,
    );
    watchIdRef.current = watchId;
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // SSR initial state must be "idle"; "unavailable" is post-mount-only,
      // so this sync setState is the intended escape hatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        coords: null,
        source: null,
        status: "unavailable",
        error: "Geolocalização não suportada neste navegador",
      });
      return;
    }
    requestFix();
    return () => {
      // Bumping the version invalidates any in-flight callbacks. Lint warns
      // about post-unmount ref reads but mutating-to-invalidate is the point.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      versionRef.current++;
      ipAbortRef.current?.abort();
      if (watchIdRef.current !== null) {
        logInfo("watch cleared on unmount");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestFix]);

  return { ...state, retry: requestFix };
}
