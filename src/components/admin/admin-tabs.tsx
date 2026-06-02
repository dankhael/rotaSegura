"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type TabId = "dashboard" | "locais";

type AdminTab = {
  id: TabId;
  label: string;
  placeholder: string;
};

// Abas placeholder — cada seção recebe sua implementação em PRs futuras.
const ADMIN_TABS: AdminTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    placeholder: "Indicadores e visão geral chegam aqui em breve.",
  },
  {
    id: "locais",
    label: "Gestão de Locais",
    placeholder: "Cadastro e edição dos pontos de apoio chegam aqui em breve.",
  },
];

export function AdminTabs() {
  const [activeId, setActiveId] = useState<TabId>("dashboard");

  return (
    <section>
      <div
        role="tablist"
        aria-label="Seções do painel"
        className="flex gap-1 border-b"
        style={{ borderColor: "var(--line)" }}
      >
        {ADMIN_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onSelect={() => setActiveId(tab.id)}
          />
        ))}
      </div>

      {ADMIN_TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="mt-6"
        >
          {tab.id === activeId && <PlaceholderPanel title={tab.label} message={tab.placeholder} />}
        </div>
      ))}
    </section>
  );
}

type TabButtonProps = {
  tab: AdminTab;
  isActive: boolean;
  onSelect: () => void;
};

function TabButton({ tab, isActive, onSelect }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      onClick={onSelect}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        isActive ? "border-current" : "border-transparent",
      )}
      style={{ color: isActive ? "var(--ink)" : "var(--ink-3)" }}
    >
      {tab.label}
    </button>
  );
}

function PlaceholderPanel({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="grid place-items-center px-6 py-16 text-center"
      style={{
        background: "var(--surface)",
        border: "1px dashed var(--line)",
        borderRadius: "var(--r-lg)",
      }}
    >
      <div>
        <h2 className="font-bold" style={{ fontSize: 18, color: "var(--ink-2)" }}>
          {title}
        </h2>
        <p className="mt-1.5" style={{ fontSize: 14, color: "var(--ink-3)" }}>
          {message}
        </p>
        <span
          className="mt-4 inline-block px-2.5 py-1 text-xs font-semibold uppercase"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            color: "var(--ink-4)",
            letterSpacing: "0.04em",
          }}
        >
          Em construção
        </span>
      </div>
    </div>
  );
}
