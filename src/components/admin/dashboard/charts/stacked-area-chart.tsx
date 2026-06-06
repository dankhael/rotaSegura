import type { ReactNode } from "react";

export type AreaSeries = { label: string; color: string; values: number[] };

type StackedAreaChartProps = {
  series: AreaSeries[];
  height?: number;
  ariaLabel: string;
};

const VIEW_WIDTH = 600;

/**
 * Área empilhada em SVG (US10 v2), sem dependência. Cada série soma sobre a
 * anterior; o eixo Y escala pelo total máximo por dia. Largura fluida via
 * viewBox (preserveAspectRatio none); os rótulos do eixo X ficam no painel.
 */
export function StackedAreaChart({ series, height = 168, ariaLabel }: StackedAreaChartProps) {
  const length = series[0]?.values.length ?? 0;
  if (length === 0) {
    return <svg width="100%" height={height} role="img" aria-label={ariaLabel} />;
  }

  const max = Math.max(...perIndexTotals(series, length), 1);
  const xAt = (index: number) =>
    length > 1 ? (index / (length - 1)) * VIEW_WIDTH : VIEW_WIDTH / 2;
  const yAt = (value: number) => height - (value / max) * (height - 2) - 1;

  // reduce acumula a base inferior (lower) de forma imutável — sem reatribuir
  // variável durante o render (regra react-hooks/immutability).
  const { nodes } = series.reduce<{ lower: number[]; nodes: ReactNode[] }>(
    (acc, serie) => {
      const upper = acc.lower.map((base, index) => base + (serie.values[index] ?? 0));
      const top = upper.map((value, index) => `${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`);
      const bottom = acc.lower
        .map((value, index) => `${xAt(index).toFixed(1)},${yAt(value).toFixed(1)}`)
        .reverse();
      const band = (
        <g key={serie.label}>
          <polygon
            points={[...top, ...bottom].join(" ")}
            style={{ fill: serie.color, fillOpacity: 0.18 }}
          />
          <polyline
            points={top.join(" ")}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            style={{ stroke: serie.color }}
          />
        </g>
      );
      return { lower: upper, nodes: [...acc.nodes, band] };
    },
    { lower: new Array<number>(length).fill(0), nodes: [] },
  );

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      {nodes}
    </svg>
  );
}

function perIndexTotals(series: AreaSeries[], length: number): number[] {
  return Array.from({ length }, (_, index) =>
    series.reduce((sum, serie) => sum + (serie.values[index] ?? 0), 0),
  );
}
