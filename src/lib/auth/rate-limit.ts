// Rate limiter in-memory baseado em janela deslizante por chave (ex.: IP).
//
// Limitação conhecida: em ambientes serverless (Vercel) o estado vive apenas
// dentro de uma instância e some no cold start. Atende o critério da RS-US02
// em dev e single-instance; para prod multi-instância migrar para Redis/Upstash.

interface Bucket {
  hits: number[];
  lastSeen: number;
}

const buckets = new Map<string, Bucket>();

// Sweep oportunista: a cada N chamadas, varremos buckets que estão silenciosos
// há > 5×janela e descartamos. Evita crescer indefinidamente em processos
// long-running sem precisar de setInterval (que prenderia o event loop).
const SWEEP_INTERVAL = 200;
let callCount = 0;

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function sweepStale(now: number, windowMs: number): void {
  const cutoff = now - windowMs * 5;
  for (const [key, bucket] of buckets) {
    if (bucket.lastSeen < cutoff) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  if (++callCount % SWEEP_INTERVAL === 0) sweepStale(now, opts.windowMs);

  const bucket = buckets.get(key) ?? { hits: [], lastSeen: now };
  // Descarta hits fora da janela atual.
  const fresh = bucket.hits.filter((ts) => ts > windowStart);

  if (fresh.length >= opts.max) {
    const oldest = fresh[0];
    const retryAfterMs = oldest + opts.windowMs - now;
    buckets.set(key, { hits: fresh, lastSeen: now });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  fresh.push(now);
  buckets.set(key, { hits: fresh, lastSeen: now });

  return {
    allowed: true,
    remaining: opts.max - fresh.length,
    retryAfterSeconds: 0,
  };
}

/** Usado por testes para isolar o estado entre casos. */
export function resetRateLimit(key?: string): void {
  if (key === undefined) {
    buckets.clear();
    callCount = 0;
  } else {
    buckets.delete(key);
  }
}
