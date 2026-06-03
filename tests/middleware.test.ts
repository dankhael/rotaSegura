/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { signAuthToken, AUTH_COOKIE } from "@/lib/auth/jwt";

function adminRequest(path = "/admin", token?: string): NextRequest {
  const request = new NextRequest(new URL(`http://localhost:3000${path}`));
  if (token) request.cookies.set(AUTH_COOKIE, token);
  return request;
}

describe("middleware — proteção do /admin", () => {
  it("redireciona para /login sem cookie de sessão", async () => {
    const res = await middleware(adminRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redireciona para /login quando o token é inválido", async () => {
    const res = await middleware(adminRequest("/admin", "nao-eh-um-jwt"));

    expect(res.headers.get("location")).toContain("/login");
  });

  it("redireciona quando o token é válido mas o role não é ADMIN", async () => {
    const token = await signAuthToken({ sub: "2", email: "user@rs.com", role: "USER" });

    const res = await middleware(adminRequest("/admin", token));

    expect(res.headers.get("location")).toContain("/login");
  });

  it("libera o acesso com cookie de ADMIN válido", async () => {
    const token = await signAuthToken({ sub: "1", email: "admin@rs.com", role: "ADMIN" });

    const res = await middleware(adminRequest("/admin", token));

    expect(res.headers.get("location")).toBeNull();
  });

  it("preserva a rota original em ?next= ao redirecionar para /login", async () => {
    const res = await middleware(adminRequest("/admin/usuarios?tab=ativos"));

    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    // path original + query são preservados para o post-login voltar ao destino.
    const url = new URL(location, "http://localhost:3000");
    expect(url.searchParams.get("next")).toBe("/admin/usuarios?tab=ativos");
  });
});
