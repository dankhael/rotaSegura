/**
 * Rotas internas da API consumidas pelo client, centralizadas para evitar
 * string duplicada. A rota de criação de relato mudou de /api/occurrences
 * para /api/reports no #6 — manter num só lugar evita divergência.
 *
 * @example fetch(apiEndpoints.reports, { method: "POST", body })
 */
export const apiEndpoints = {
  reports: "/api/reports",
  geocode: "/api/geocode",
} as const;
