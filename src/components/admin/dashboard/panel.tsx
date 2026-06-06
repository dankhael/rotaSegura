import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

// Chrome compartilhado dos painéis do dashboard (US10 v2): título com ícone,
// subtítulo opcional, ação à direita e o conteúdo. Centraliza o cartão para os
// painéis não repetirem borda/raio/padding.
export function DashboardPanel({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <section
      className={cn("flex flex-col p-4 sm:p-5", className)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-bold" style={{ fontSize: 15, color: "var(--ink)" }}>
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
