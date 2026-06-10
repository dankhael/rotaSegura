/**
 * Corte de validade de ocorrências no mapa público (RS-TK05): tudo com
 * `lastReportedAt` anterior ao retorno deixa de ser "ativo" no GET
 * /api/occurrences, mas permanece no banco para auditoria/dashboard.
 * `now` é injetável para testes determinísticos.
 *
 * @example activeWindowCutoff(1440, new Date()) // agora − 24h
 */
export function activeWindowCutoff(windowMin: number, now: Date): Date {
  return new Date(now.getTime() - windowMin * 60_000);
}
