import { AdminTabs } from "@/components/admin/admin-tabs";

// Rota protegida pelo middleware (src/middleware.ts): exige cookie de ADMIN.
export default function AdminPage() {
  return (
    <main className="mx-auto px-4 pb-10 pt-6 sm:px-6" style={{ maxWidth: 1080 }}>
      <header className="mb-6">
        <h1
          className="font-bold"
          style={{ fontSize: 26, letterSpacing: "-0.02em", color: "var(--ink)" }}
        >
          Painel administrativo
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "var(--ink-3)" }}>
          Gerencie os dados da Rota Segura.
        </p>
      </header>

      <AdminTabs />
    </main>
  );
}
