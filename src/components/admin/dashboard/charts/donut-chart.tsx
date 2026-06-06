export type DonutSegment = { value: number; color: string; label: string };

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerPrimary: string;
  centerSecondary: string;
  ariaLabel: string;
};

/**
 * Donut em SVG (US10 v2) via stroke-dasharray — sem dependência. Começa às 12h
 * (rotação -90°). Renderiza só a trilha quando o total é zero.
 */
export function DonutChart({
  segments,
  size = 160,
  thickness = 22,
  centerPrimary,
  centerSecondary,
  ariaLabel,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const arcs = withCumulativeOffsets(segments, total, circumference);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={thickness}
        style={{ stroke: "var(--line-soft)" }}
      />
      {total > 0 &&
        arcs.map((arc) => (
          <circle
            key={arc.segment.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ stroke: arc.segment.color }}
          />
        ))}
      <text
        x={center}
        y={center - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 26, fontWeight: 700, fill: "var(--ink)" }}
      >
        {centerPrimary}
      </text>
      <text
        x={center}
        y={center + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 11, fill: "var(--ink-3)" }}
      >
        {centerSecondary}
      </text>
    </svg>
  );
}

type Arc = { segment: DonutSegment; dash: number; offset: number };

// Posições acumuladas de cada arco sem reatribuir variável durante o render.
function withCumulativeOffsets(
  segments: DonutSegment[],
  total: number,
  circumference: number,
): Arc[] {
  return segments.reduce<{ offset: number; arcs: Arc[] }>(
    (acc, segment) => {
      const dash = total > 0 ? (segment.value / total) * circumference : 0;
      return {
        offset: acc.offset + dash,
        arcs: [...acc.arcs, { segment, dash, offset: acc.offset }],
      };
    },
    { offset: 0, arcs: [] },
  ).arcs;
}
