"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
};

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  required = false,
  autoComplete,
}: Props) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

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
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
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
        "
        style={{
          borderColor: error ? "#ef4444" : "rgba(255,255,255,0.10)",
        }}
      />

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
