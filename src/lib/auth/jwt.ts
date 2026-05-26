import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: "ADMIN" | "USER";
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
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

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    (payload.role !== "ADMIN" && payload.role !== "USER")
  ) {
    throw new Error("Token com claims inválidas");
  }

  return payload as AuthTokenPayload;
}
