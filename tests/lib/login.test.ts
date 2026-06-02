import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { login, LoginError } from "@/lib/login";

type ResponseInit = { ok: boolean; status: number };

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: async () => body,
  } as Response;
}

describe("login()", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia POST para /api/auth/login e retorna o usuário no sucesso", async () => {
    const payload = {
      user: { id: "1", email: "admin@rs.com", role: "ADMIN" as const },
    };
    fetchMock.mockResolvedValue(jsonResponse(payload, { ok: true, status: 200 }));

    const result = await login({ email: "admin@rs.com", password: "secret" });

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lança LoginError com os details de validação (400)", async () => {
    const details = [{ field: "email", message: "email deve ter um formato válido" }];
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Payload inválido", details }, { ok: false, status: 400 }),
    );

    await expect(login({ email: "x", password: "" })).rejects.toMatchObject({
      status: 400,
      details,
    });
  });

  it("expõe a mensagem da API em credenciais inválidas (401)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Credenciais inválidas" }, { ok: false, status: 401 }),
    );

    const error = await login({ email: "a@b.com", password: "x" }).catch((e) => e);

    expect(error).toBeInstanceOf(LoginError);
    expect(error.status).toBe(401);
    expect(error.message).toBe("Credenciais inválidas");
  });

  it("propaga retryAfterSeconds no rate limit (429)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: "Muitas tentativas", retryAfterSeconds: 30 },
        { ok: false, status: 429 },
      ),
    );

    await expect(login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 30,
    });
  });

  it("usa mensagem padrão quando o backend não envia error (500)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

    await expect(login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 500,
      message: "Erro ao realizar login",
    });
  });

  it("lança LoginError(status 0) quando o fetch falha (rede)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 0,
      message: "Erro de conexão com o servidor",
    });
  });

  it("lança LoginError quando a resposta não é JSON válido", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response);

    await expect(login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      status: 502,
      message: "Resposta inválida do servidor",
    });
  });
});
