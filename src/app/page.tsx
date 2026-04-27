import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-24 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <h1 className="text-5xl font-semibold tracking-tight">Rota Segura</h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        App de segurança em desastres — encontre rotas e pontos de apoio durante emergências.
      </p>
      <Link
        href="/mapa"
        className="rounded-full border border-zinc-900/10 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:border-zinc-50/10 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Abrir mapa
      </Link>
    </main>
  );
}
