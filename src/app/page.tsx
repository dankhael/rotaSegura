import { TopBar } from "@/components/home/top-bar";
import { AlertBanner } from "@/components/home/alert-banner";
import { Hero } from "@/components/home/hero";
import { MapCard } from "@/components/home/map-card";
import { DonationCard } from "@/components/home/donation-card";
import { ReportTrigger } from "@/components/home/report-trigger";
import { PushPermissionCard } from "@/components/notifications/push-permission-card";

export default function Home() {
  // VAPID público é seguro no client (CLAUDE.md / AC-10 — só a chave PRIVADA
  // fica server-side). Lemos no server para entregar inlined no markup.
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  return (
    <main className="mx-auto px-4 pb-10 pt-5 sm:px-6" style={{ maxWidth: 1280 }}>
      <TopBar />
      <AlertBanner />
      <Hero />

      <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MapCard />
        <aside className="flex flex-col gap-3">
          <PushPermissionCard vapidPublicKey={vapidPublicKey} />
          <ReportTrigger />
          <DonationCard />
        </aside>
      </div>
    </main>
  );
}
