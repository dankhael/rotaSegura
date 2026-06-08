"use client";

import { useState } from "react";

import { OccurrenceDashboard } from "@/components/admin/dashboard/occurrence-dashboard";
import { DonationsPanel } from "@/components/admin/donations-panel";
import { SupportPointsPanel } from "@/components/admin/support-points-panel";
import { cn } from "@/lib/utils";

type TabId = "dashboard" | "locais" | "doacoes";

type AdminTab = {
  id: TabId;
  label: string;
};

const ADMIN_TABS: AdminTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "locais",
    label: "Gestão de Locais",
  },
  {
    id: "doacoes",
    label: "Gestão de Doações",
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
          {tab.id === activeId && (
            <>
              {tab.id === "dashboard" && <OccurrenceDashboard />}
              {tab.id === "locais" && <SupportPointsPanel />}
              {tab.id === "doacoes" && <DonationsPanel />}
            </>
          )}
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
