export type FilterOption = { value: string; label: string };

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
};

// Select rotulado reusado pelos filtros do dashboard (tipo, status). "" = Todos.
export function FilterSelect({ id, label, value, options, onSelect }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onSelect(event.target.value)}
        className="h-10 rounded-xl border px-3 text-sm"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
