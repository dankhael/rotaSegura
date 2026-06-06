import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth/admin-guard";

// Protege o painel: sem cookie httpOnly de ADMIN válido, redireciona ao /login
// preservando a rota original em `?next=` para o post-login voltar ao destino.
export async function middleware(request: NextRequest) {
  if (await isAdminRequest(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const original = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", original);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
