import type { NextRequest } from "next/server";

/**
 * Extrai o IP do cliente preferindo headers populados por proxies confiáveis
 * (Vercel/Cloudflare). Sem proxy, x-forwarded-for é forjável — usar só para
 * agrupamento de rate-limit, nunca para autenticação/identidade.
 *
 * Retorna "unknown" quando nenhum header está presente para que o chamador
 * sempre tenha uma chave estável.
 */
export function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
