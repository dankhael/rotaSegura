"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  type?: string;
};

export function TextInput({ value, onChange, placeholder, error, type = "text" }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
