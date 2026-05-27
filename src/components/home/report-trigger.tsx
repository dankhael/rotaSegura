"use client";

import { useState } from "react";
import { ReportModal } from "./report-modal/modal-report";
import { SosCard } from "./sos-card";

export function ReportTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SosCard onOpenReport={() => setOpen(true)} />
      <ReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
