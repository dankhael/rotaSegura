/** @vitest-environment node */

import { describe, it, expect } from "vitest";

import { POST } from "@/app/api/auth/logout/route";
import { AUTH_COOKIE } from "@/lib/auth/jwt";

describe("POST /api/auth/logout", () => {
  it("retorna 204 e limpa o cookie de sessão", async () => {
    const res = await POST();

    expect(res.status).toBe(204);

    const cookie = res.cookies.get(AUTH_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("é idempotente — pode ser chamado sem cookie e ainda responde 204", async () => {
    const first = await POST();
    const second = await POST();

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
  });
});
