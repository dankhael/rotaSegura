import { useId } from "react";

type AdminTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
};

export function AdminTextField({
  label,
  value,
  onChange,
  error,
  required,
  inputMode,
  placeholder,
}: AdminTextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-(--ink-2)">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="h-10 rounded-lg border bg-(--surface) px-3 text-sm text-(--ink) outline-none transition focus-visible:ring-2 focus-visible:ring-(--rs-info)"
        style={{ borderColor: hasError ? "var(--emergency)" : "var(--line)" }}
      />
      {hasError && (
        <p id={errorId} role="alert" className="text-xs font-medium text-(--emergency-ink)">
          {error}
        </p>
      )}
    </div>
  );
}

type AdminTextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
};

export function AdminTextareaField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
}: AdminTextareaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-(--ink-2)">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        rows={4}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="min-h-24 resize-y rounded-lg border bg-(--surface) px-3 py-2 text-sm text-(--ink) outline-none transition focus-visible:ring-2 focus-visible:ring-(--rs-info)"
        style={{ borderColor: hasError ? "var(--emergency)" : "var(--line)" }}
      />
      {hasError && (
        <p id={errorId} role="alert" className="text-xs font-medium text-(--emergency-ink)">
          {error}
        </p>
      )}
    </div>
  );
}

type AdminSelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  error?: string;
};

export function AdminSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: AdminSelectFieldProps<T>) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-(--ink-2)">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="h-10 rounded-lg border bg-(--surface) px-3 text-sm text-(--ink) outline-none transition focus-visible:ring-2 focus-visible:ring-(--rs-info)"
        style={{ borderColor: hasError ? "var(--emergency)" : "var(--line)" }}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p id={errorId} role="alert" className="text-xs font-medium text-(--emergency-ink)">
          {error}
        </p>
      )}
    </div>
  );
}
