const MINUTE = 60_000;

/**
 * Tempo relativo em pt-BR para a lista de ocorrências recentes (US10 v2).
 * Recebe `now` por parâmetro para ser determinístico em testes.
 *
 * @example timeAgo("2026-06-05T12:00:00Z", new Date("2026-06-05T17:00:00Z")) // "há 5 h"
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} sem`;

  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}
