type InfoRowProps = {
  label: string;
  value: string;
  icon: string;
};

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      {/* ICON */}
      <div
        className="
          w-9 h-9
          rounded-xl
          flex items-center justify-center
          shrink-0
          text-[18px]
          bg-white/5
          shadow-md
        "
      >
        {icon}
      </div>

      {/* CONTENT */}
      <div className="flex flex-col">
        <span className="text-xs text-(--ink-3) mb-1">{label}</span>

        <span className="text-sm font-semibold leading-relaxed text-(--ink)">{value}</span>
      </div>
    </div>
  );
}
