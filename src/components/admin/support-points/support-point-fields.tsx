import { useId } from "react";

import { SUPPORT_POINT_TYPES } from "@/lib/support-points/form";
import type { SupportPointType } from "@/types/support-point";

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
};

export function SupportPointTextField({
  label,
  value,
  onChange,
  error,
  required,
  inputMode,
  placeholder,
}: TextFieldProps) {
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

type SelectFieldProps = {
  label: string;
  value: SupportPointType;
  onChange: (value: SupportPointType) => void;
  error?: string;
};

export function SupportPointSelectField({ label, value, onChange, error }: SelectFieldProps) {
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
        onChange={(event) => onChange(event.target.value as SupportPointType)}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="h-10 rounded-lg border bg-(--surface) px-3 text-sm text-(--ink) outline-none transition focus-visible:ring-2 focus-visible:ring-(--rs-info)"
        style={{ borderColor: hasError ? "var(--emergency)" : "var(--line)" }}
      >
        {SUPPORT_POINT_TYPES.map((item) => (
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
