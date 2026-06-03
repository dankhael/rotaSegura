import { LoginHeader } from "@/components/login/login-header";
import { LoginForm } from "@/components/login/login-form";

// Aceita apenas paths internos absolutos para evitar open redirect via `?next=`
// (algo tipo //evil.com ou https://evil.com cairia fora).
function safeNext(next: string | string[] | undefined): string | undefined {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextUrl = safeNext(next);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div
        className="
          w-full
          max-w-md
          rounded-3xl
          border
          border-white/10
          bg-white/5
          backdrop-blur-md
          shadow-2xl
          p-8
        "
      >
        <LoginHeader />

        <LoginForm nextUrl={nextUrl} />
      </div>
    </main>
  );
}
