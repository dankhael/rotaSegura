"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` on import, so SSR must be disabled to avoid
// runtime errors during the server render pass.
const ShelterMap = dynamic(() => import("@/components/ui/ShelterMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-gray-100 animate-pulse flex items-center justify-center">
      Carregando mapa...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="container mx-auto p-4 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Rota Segura</h1>
        <p className="text-muted-foreground">
          Encontre pontos de apoio em situações de emergência.
        </p>
      </header>

      <section className="grid gap-4">
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Mapa de Abrigos</h2>
          <ShelterMap />
        </div>
      </section>
    </main>
  );
}
