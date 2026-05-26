// Rate limiter in-memory baseado em janela deslizante por chave (ex.: IP).
//
// Limitação conhecida: em ambientes serverless (Vercel) o estado vive apenas
// dentro de uma instância e some no cold start. Atende o critério da RS-US02
// em dev e single-instance; para prod multi-instância migrar para Redis/Upstash.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  // Descarta hits fora da janela atual.
  const fresh = bucket.hits.filter((ts) => ts > windowStart);

  if (fresh.length >= opts.max) {
    const oldest = fresh[0];
    const retryAfterMs = oldest + opts.windowMs - now;
    buckets.set(key, { hits: fresh });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  fresh.push(now);
  buckets.set(key, { hits: fresh });

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
  } else {
    buckets.delete(key);
  }
}
