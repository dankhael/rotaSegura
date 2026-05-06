// Visual-only sample data shown over the map. Not backed by the API —
// kept here so the home view matches the mockup until the backend pipes
// real points in.
export type MockPointKind = "shelter" | "medical" | "supply";
export type MockPointStatus = "open" | "full" | "partial";

export type MockPoint = {
  kind: MockPointKind;
  name: string;
  addr: string;
  stats: [{ n: string; l: string }, { n: string; l: string }];
  coords: [number, number];
  status: MockPointStatus;
};

export const MOCK_POINTS: MockPoint[] = [
  {
    kind: "shelter",
    name: "EE Cônego João Pessoa",
    addr: "R. dos Navegantes, 1234 — Boa Viagem",
    stats: [
      { n: "34", l: "Vagas" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.118, -34.902],
    status: "open",
  },
  {
    kind: "shelter",
    name: "Ginásio Geraldão",
    addr: "Av. Eng. Abdias de Carvalho — Madalena",
    stats: [
      { n: "0", l: "Vagas" },
      { n: "Lotado", l: "Status" },
    ],
    coords: [-8.063, -34.913],
    status: "full",
  },
  {
    kind: "shelter",
    name: "EE Padre Henrique",
    addr: "R. Padre Inglês — Boa Vista",
    stats: [
      { n: "120", l: "Vagas" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.058, -34.89],
    status: "open",
  },
  {
    kind: "shelter",
    name: "CEU Areias",
    addr: "Av. Recife — Areias",
    stats: [
      { n: "58", l: "Vagas" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.092, -34.945],
    status: "open",
  },
  {
    kind: "medical",
    name: "UPA Boa Viagem",
    addr: "Av. Eng. Domingos Ferreira",
    stats: [
      { n: "12 min", l: "Espera" },
      { n: "24h", l: "Operando" },
    ],
    coords: [-8.123, -34.902],
    status: "open",
  },
  {
    kind: "medical",
    name: "Hospital Getúlio Vargas",
    addr: "R. Tabaiares — Ilha do Leite",
    stats: [
      { n: "32 min", l: "Espera" },
      { n: "Pronto-Socorro", l: "Setor" },
    ],
    coords: [-8.063, -34.892],
    status: "open",
  },
  {
    kind: "medical",
    name: "PSF Brasília Teimosa",
    addr: "R. Beira Rio — B. Teimosa",
    stats: [
      { n: "8 min", l: "Espera" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.087, -34.88],
    status: "open",
  },
  {
    kind: "supply",
    name: "CC Brasília Teimosa",
    addr: "R. Beira Rio, 88",
    stats: [
      { n: "Água", l: "Disponível" },
      { n: "Alimentos", l: "Limitado" },
    ],
    coords: [-8.082, -34.876],
    status: "partial",
  },
  {
    kind: "supply",
    name: "Compaz Eduardo Campos",
    addr: "Av. Recife, 5500",
    stats: [
      { n: "Tudo", l: "Disponível" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.105, -34.94],
    status: "open",
  },
  {
    kind: "supply",
    name: "Igreja Madre de Deus",
    addr: "R. Madre de Deus — Recife Antigo",
    stats: [
      { n: "Kits", l: "Disponível" },
      { n: "Aberto", l: "Status" },
    ],
    coords: [-8.06, -34.872],
    status: "open",
  },
];

export const POINT_COUNTS = {
  all: MOCK_POINTS.length,
  shelter: MOCK_POINTS.filter((p) => p.kind === "shelter").length,
  medical: MOCK_POINTS.filter((p) => p.kind === "medical").length,
  supply: MOCK_POINTS.filter((p) => p.kind === "supply").length,
};
