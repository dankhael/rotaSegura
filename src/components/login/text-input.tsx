"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  placeholder?: string;
};

/**
 * Input com label visível e mensagem de erro acessível (`aria-invalid` +
 * `aria-describedby`). Label visível > placeholder porque o placeholder some
 * ao digitar, tem contraste baixo e é inconsistente em leitores de tela.
 */
export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  error,
  required = false,
  autoComplete,
  autoFocus,
  placeholder,
}: Props) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-(--ink-2)">
        {label}
      </label>

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="
          h-13
          w-full
          rounded-2xl
          border
          bg-white/5
          px-4
          text-sm
          text-(--ink)
          outline-none
          focus-visible:ring-2
          focus-visible:ring-(--ink)
          focus-visible:ring-offset-2
        "
        style={{
          borderColor: hasError ? "#ef4444" : "rgba(255,255,255,0.10)",
        }}
      />

      {hasError && (
        <p id={errorId} role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
