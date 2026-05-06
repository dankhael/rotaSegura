import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type GeolocateResponse = {
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
  source: string;
  ip: string | null;
};

type ProviderResult = { ok: true; payload: GeolocateResponse } | { ok: false; reason: string };

type Provider = {
  name: string;
  url: (ip: string | null) => string;
  parse: (data: unknown) => Omit<GeolocateResponse, "source"> | null;
};

// Many public IP-geo services 403 generic fetch UAs (treats them as bots),
// so we send a real-looking UA. Same string for every provider.
const PROXY_UA =
  "Mozilla/5.0 (compatible; rotaSegura/1.0; +https://github.com/dankhael/rotaSegura)";

/**
 * Server-side IP geolocation proxy. Browsers can't reliably hit public
 * geolocation APIs (CORS, origin allowlists, abuse blocking against
 * localhost), so we route through this endpoint and try multiple
 * providers until one returns parseable lat/lng.
 */
const PROVIDERS: Provider[] = [
  {
    name: "geojs",
    url: (ip) =>
      ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : "https://get.geojs.io/v1/ip/geo.json",
    parse: (data) => {
      const d = data as Record<string, unknown>;
      const lat = parseFloat(String(d.latitude ?? ""));
      const lng = parseFloat(String(d.longitude ?? ""));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat,
        lng,
        city: typeof d.city === "string" ? d.city : null,
        country: typeof d.country === "string" ? d.country : null,
        ip: typeof d.ip === "string" ? d.ip : null,
      };
    },
  },
  {
    name: "freeipapi",
    url: (ip) => (ip ? `https://freeipapi.com/api/json/${ip}` : "https://freeipapi.com/api/json"),
    parse: (data) => {
      const d = data as Record<string, unknown>;
      const lat = typeof d.latitude === "number" ? d.latitude : NaN;
      const lng = typeof d.longitude === "number" ? d.longitude : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat,
        lng,
        city: typeof d.cityName === "string" ? d.cityName : null,
        country: typeof d.countryName === "string" ? d.countryName : null,
        ip: typeof d.ipAddress === "string" ? d.ipAddress : null,
      };
    },
  },
  // ipapi.co intentionally last: it sits behind Cloudflare's bot challenge,
  // returns 403 to plain fetch UAs, and burns ~400ms before failing — only
  // useful if both providers above are simultaneously down.
  {
    name: "ipapi.co",
    url: (ip) => (ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/"),
    parse: (data) => {
      const d = data as Record<string, unknown>;
      const lat = typeof d.latitude === "number" ? d.latitude : NaN;
      const lng = typeof d.longitude === "number" ? d.longitude : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat,
        lng,
        city: typeof d.city === "string" ? d.city : null,
        country: typeof d.country_name === "string" ? d.country_name : null,
        ip: typeof d.ip === "string" ? d.ip : null,
      };
    },
  },
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((re) => re.test(ip));
}

function readClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

async function tryProvider(provider: Provider, ip: string | null): Promise<ProviderResult> {
  const url = provider.url(ip);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": PROXY_UA, Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[geolocate]", provider.name, "non-ok", {
        status: res.status,
        bodyPreview: body.slice(0, 200),
      });
      return { ok: false, reason: `${provider.name} http ${res.status}` };
    }
    const raw = await res.text();
    const data = safeJsonParse(raw);
    if (data === null) {
      console.warn("[geolocate]", provider.name, "non-json body", {
        bodyPreview: raw.slice(0, 200),
      });
      return { ok: false, reason: `${provider.name} non-json response` };
    }
    const parsed = provider.parse(data);
    if (!parsed) {
      console.warn("[geolocate]", provider.name, "missing coords", {
        keys: Object.keys(data as object),
        sample: data,
      });
      return { ok: false, reason: `${provider.name} missing coords` };
    }
    console.log("[geolocate]", provider.name, "ok", {
      city: parsed.city,
      country: parsed.country,
      ip: parsed.ip,
    });
    return { ok: true, payload: { ...parsed, source: provider.name } };
  } catch (err) {
    console.warn("[geolocate]", provider.name, "threw", { err: String(err) });
    return { ok: false, reason: `${provider.name} threw: ${String(err)}` };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rawIp = readClientIp(req);
  // In dev the client IP is loopback / private — let providers default to
  // the server's outbound IP so we still get a city-level fix.
  const ip = rawIp && !isPrivateIp(rawIp) ? rawIp : null;
  console.log("[geolocate] request", { rawIp, queriedIp: ip });

  const failures: string[] = [];
  for (const provider of PROVIDERS) {
    const result = await tryProvider(provider, ip);
    if (result.ok) {
      return NextResponse.json(result.payload);
    }
    failures.push(result.reason);
  }

  console.warn("[geolocate] all providers failed", { failures });
  return NextResponse.json(
    { error: "All IP geolocation providers failed", failures, requestedIp: ip },
    { status: 502 },
  );
}
