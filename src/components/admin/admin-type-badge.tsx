import { cn } from "@/lib/utils";

type AdminTypeBadgeProps = {
  label: string;
  tone: "info" | "emergency" | "safe" | "warn" | "neutral";
};

const TONE_CLASS: Record<AdminTypeBadgeProps["tone"], string> = {
  info: "border-(--rs-info)/25 bg-(--rs-info-soft) text-(--rs-info-ink)",
  emergency: "border-(--emergency)/25 bg-(--emergency-soft) text-(--emergency-ink)",
  safe: "border-(--safe)/25 bg-(--safe-soft) text-(--safe-ink)",
  warn: "border-(--warn)/30 bg-(--warn-soft) text-(--warn-ink)",
  neutral: "border-(--line) bg-(--surface-2) text-(--ink-3)",
};

export function AdminTypeBadge({ label, tone }: AdminTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-1 text-center text-xs font-semibold leading-none",
        TONE_CLASS[tone],
      )}
    >
      {label}
    </span>
  );
}
