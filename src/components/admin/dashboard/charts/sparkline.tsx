type SparklineProps = {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  ariaLabel: string;
};

/**
 * Mini gráfico de linha+área para os stat cards (US10 v2). Puro SVG, sem
 * dependência. Escala pelo maior valor; achata no piso quando tudo é zero.
 */
export function Sparkline({ values, color, width = 104, height = 34, ariaLabel }: SparklineProps) {
  if (values.length === 0) {
    return <svg width={width} height={height} role="img" aria-label={ariaLabel} />;
  }

  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const point = (value: number, index: number) =>
    `${(index * stepX).toFixed(1)},${(height - (value / max) * (height - 2) - 1).toFixed(1)}`;

  const line = values.map(point).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <polygon points={area} style={{ fill: color, fillOpacity: 0.12 }} />
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ stroke: color }}
      />
    </svg>
  );
}
