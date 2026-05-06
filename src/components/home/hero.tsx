type Stat = { num: string; label: string; color: string };

const STATS: Stat[] = [
  { num: "24", label: "Abrigos abertos", color: "var(--safe)" },
  { num: "7", label: "Postos médicos", color: "var(--emergency)" },
  { num: "12", label: "Distribuição", color: "var(--rs-info)" },
];

export function Hero() {
  return (
    <div className="mt-5 flex items-end justify-between gap-6 flex-wrap">
      <div>
        <h1
          className="m-0 font-bold"
          style={{
            fontSize: 30,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Encontre apoio em segundos.
        </h1>
        <p
          className="mt-1.5 leading-relaxed"
          style={{
            fontSize: 15,
            color: "var(--ink-3)",
            maxWidth: 540,
          }}
        >
          Localize o abrigo, posto médico ou ponto de distribuição mais próximo. Reporte uma
          situação de emergência para ajudar a sua comunidade.
        </p>
      </div>
      <div className="flex gap-2">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        minWidth: 96,
      }}
    >
      <div
        className="font-bold flex items-baseline gap-1.5"
        style={{ fontSize: 20, letterSpacing: "-0.02em" }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: stat.color,
          }}
        />
        {stat.num}
      </div>
      <div
        className="uppercase font-medium mt-0.5"
        style={{
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--ink-3)",
        }}
      >
        {stat.label}
      </div>
    </div>
  );
}
