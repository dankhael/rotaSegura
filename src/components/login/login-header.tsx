import Link from "next/link";

export function LoginHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/"
        className="
          inline-flex
          items-center
          gap-2
          mb-6
          text-sm
          font-semibold
          text-(--ink-2)
          transition-colors
          hover:text-(--ink)
        "
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Voltar
      </Link>

      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-(--ink)">
          Acesso administrativo
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-(--ink-3)">
          Entre com suas credenciais para acessar o painel do administrador
        </p>
      </div>
    </div>
  );
}
