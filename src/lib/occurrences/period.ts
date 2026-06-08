export type DashboardPeriod = "today" | "7d" | "30d";

export interface PeriodRange {
  // Início da janela atual (inclusive); o fim é "agora".
  start: Date;
  // Início da janela anterior de mesmo tamanho (para a tendência "vs período anterior").
  previousStart: Date;
}

const PERIOD_DAYS: Record<Exclude<DashboardPeriod, "today">, number> = { "7d": 7, "30d": 30 };

const DAY_MS = 86_400_000;

/**
 * Converte um período do dashboard na janela atual [start, agora] e na janela
 * anterior de mesmo tamanho [previousStart, start) — base da tendência do US10 v2.
 * Datas em UTC (servidor/DB) — simplificação aceitável para o estudo.
 *
 * @example periodRange("7d", now) // { start: now-7d, previousStart: now-14d }
 */
export function periodRange(period: DashboardPeriod, now: Date): PeriodRange {
  if (period === "today") {
    const start = startOfUtcDay(now);
    return { start, previousStart: addDays(start, -1) };
  }
  const days = PERIOD_DAYS[period];
  return { start: addDays(now, -days), previousStart: addDays(now, -days * 2) };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
