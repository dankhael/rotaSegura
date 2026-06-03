import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth/jwt";

async function isAdmin(token: string): Promise<boolean> {
  try {
    const payload = await verifyAuthToken(token);
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}

// Protege o painel: sem cookie httpOnly de ADMIN válido, redireciona ao /login
// preservando a rota original em `?next=` para o post-login voltar ao destino.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (token && (await isAdmin(token))) {
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
