import { cookies } from "next/headers";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { LogoutButton } from "@/components/admin/logout-button";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth/jwt";

// Rota protegida pelo middleware (src/middleware.ts): exige cookie de ADMIN.
export default async function AdminPage() {
  const initials = await getAdminInitials();

  return (
    <main className="mx-auto px-4 pb-10 pt-6 sm:px-6" style={{ maxWidth: 1280 }}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldMark />
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--ink-4)" }}>
              Rota Segura / Defesa Civil PE
            </p>
            <h1
              className="font-bold"
              style={{ fontSize: 26, letterSpacing: "-0.02em", color: "var(--ink)" }}
            >
              Painel administrativo
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: "var(--ink-3)" }}>
              Monitore ocorrências, valide relatos e coordene a resposta em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LiveBadge />
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold"
            style={{ background: "var(--rs-info-soft)", color: "var(--rs-info-ink)" }}
            aria-hidden
          >
            {initials}
          </span>
          <LogoutButton />
        </div>
      </header>

      <AdminTabs />
    </main>
  );
}

function LiveBadge() {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
      style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink-3)" }}
    >
      <span
        className="h-2 w-2 rounded-full rs-sos-pulse"
        style={{ background: "var(--safe)" }}
        aria-hidden
      />
      Dados ao vivo
    </span>
  );
}

function ShieldMark() {
  return (
    <span
      className="grid h-11 w-11 place-items-center rounded-xl"
      style={{ background: "var(--ink)", color: "var(--surface)" }}
      aria-hidden
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    </span>
  );
}

// Iniciais do admin logado para o avatar; cai em "DC" (Defesa Civil) se o cookie
// não estiver legível (a rota é protegida, então normalmente há sessão).
async function getAdminInitials(): Promise<string> {
  try {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (!token) return "DC";
    const payload = await verifyAuthToken(token);
    return initialsFromEmail(payload.email);
  } catch {
    return "DC";
  }
}

function initialsFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const tokens = localPart.split(/[._-]+/).filter(Boolean);
  const letters = tokens.length >= 2 ? tokens[0][0] + tokens[1][0] : localPart.slice(0, 2);
  return letters.toUpperCase() || "DC";
}
