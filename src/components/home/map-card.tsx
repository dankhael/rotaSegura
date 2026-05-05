"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { POINT_COUNTS, type MockPointKind } from "./map-mock-points";

const ShelterMap = dynamic(() => import("@/components/ui/ShelterMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[540px] w-full grid place-items-center"
      style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}
    >
      Carregando mapa...
    </div>
  ),
});

type Filter = "all" | MockPointKind;

const FILTERS: { id: Filter; label: string; swatch?: string; count: number }[] = [
  { id: "all", label: "Todos", count: POINT_COUNTS.all },
  {
    id: "shelter",
    label: "Abrigos",
    swatch: "oklch(0.55 0.13 240)",
    count: POINT_COUNTS.shelter,
  },
  {
    id: "medical",
    label: "Médico",
    swatch: "oklch(0.62 0.19 25)",
    count: POINT_COUNTS.medical,
  },
  {
    id: "supply",
    label: "Suprimentos",
    swatch: "oklch(0.62 0.13 150)",
    count: POINT_COUNTS.supply,
  },
];

export function MapCard() {
  const [filter, setFilter] = useState<Filter>("all");
  const total = POINT_COUNTS.all;

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>
            Mapa de Apoio
          </span>
          <span className="ml-1" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {total} pontos ativos · raio 8 km
          </span>
        </div>
        <div
          role="group"
          aria-label="Filtros de pontos de apoio"
          className="flex gap-1.5 flex-wrap"
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              filter={f}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: 540, background: "var(--surface-2)" }}>
        <ShelterMap filter={filter} />
        <Legend />
        <MapControls />
      </div>
    </section>
  );
}

function FilterChip({
  filter,
  active,
  onClick,
}: {
  filter: { id: string; label: string; swatch?: string; count: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 transition-colors"
      style={{
        padding: "7px 11px",
        border: "1px solid var(--line)",
        borderRadius: 999,
        background: active ? "var(--ink)" : "var(--surface)",
        color: active ? "white" : "var(--ink-2)",
        borderColor: active ? "var(--ink)" : "var(--line)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {filter.swatch && (
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: filter.swatch,
          }}
        />
      )}
      {filter.label}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          background: active ? "rgba(255,255,255,0.18)" : "var(--line-soft)",
          color: active ? "white" : "var(--ink-3)",
          padding: "1px 6px",
          borderRadius: 999,
          marginLeft: 2,
        }}
      >
        {filter.count}
      </span>
    </button>
  );
}

function Legend() {
  const rows = [
    { color: "oklch(0.55 0.13 240)", label: "Abrigo" },
    { color: "oklch(0.62 0.19 25)", label: "Atendimento médico" },
    { color: "oklch(0.62 0.13 150)", label: "Distribuição de suprimentos" },
    { color: "oklch(0.30 0.04 250)", label: "Área de risco" },
  ];
  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        top: 14,
        left: 14,
        zIndex: 500,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        padding: "10px 12px",
        boxShadow: "var(--shadow-md)",
        fontSize: 12,
        minWidth: 180,
      }}
    >
      <div
        className="uppercase font-semibold mb-1.5"
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
        }}
      >
        Legenda
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center gap-2 font-medium"
          style={{ padding: "3px 0", color: "var(--ink-2)" }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: r.color,
              boxShadow: "0 0 0 3px white, 0 0 0 4px rgba(0,0,0,0.06)",
            }}
          />
          {r.label}
        </div>
      ))}
    </div>
  );
}

function MapControls() {
  const ctrlStyle = {
    width: 40,
    height: 40,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    color: "var(--ink-2)",
    boxShadow: "var(--shadow-sm)",
  } as const;

  return (
    <div
      className="absolute pointer-events-auto flex flex-col gap-2"
      style={{ top: 14, right: 14, zIndex: 500 }}
    >
      <button type="button" aria-label="Minha localização" style={ctrlStyle}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
      <button type="button" aria-label="Camadas" style={ctrlStyle}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>
    </div>
  );
}
