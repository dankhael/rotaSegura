"use client";

import { TopBar } from "@/components/home/top-bar";
import { AlertBanner } from "@/components/home/alert-banner";
import { Hero } from "@/components/home/hero";
import { MapCard } from "@/components/home/map-card";
import { SosCard } from "@/components/home/sos-card";
import { ReportModal } from "@/components/home/report-modal/modal-report";
import { useState } from "react";

export default function Home() {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <main className="mx-auto px-4 pb-10 pt-5 sm:px-6" style={{ maxWidth: 1280 }}>
      <TopBar />
      <AlertBanner />
      <Hero />

      <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MapCard />

        <aside className="flex flex-col gap-3">
          <SosCard onOpenReport={() => setReportOpen(true)} />
        </aside>
      </div>

      {/* ✅ AQUI o modal fica */}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </main>
  );
}
