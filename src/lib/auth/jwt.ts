import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

// Nome do cookie httpOnly que carrega o JWT de sessão. Compartilhado entre o
// endpoint de login e o middleware que protege o painel administrativo.
export const AUTH_COOKIE = "token";

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: "ADMIN" | "USER";
}

let cachedSecretKey: Uint8Array | undefined;

function getSecretKey(): Uint8Array {
  if (!cachedSecretKey) {
    cachedSecretKey = new TextEncoder().encode(env.JWT_SECRET);
  }
  return cachedSecretKey;
}

function isAuthTokenPayload(p: JWTPayload): p is AuthTokenPayload {
  return (
    typeof p.sub === "string" &&
    typeof p.email === "string" &&
    (p.role === "ADMIN" || p.role === "USER")
  );
}

export async function signAuthToken(
  payload: Pick<AuthTokenPayload, "sub" | "email" | "role">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });

  if (!isAuthTokenPayload(payload)) {
    throw new Error("Token com claims inválidas");
  }

  return payload;
}
