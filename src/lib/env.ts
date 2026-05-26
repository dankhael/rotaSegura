import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter no mínimo 32 caracteres (use openssl rand -base64 32)"),
  JWT_EXPIRES_IN: z.string().default("1h"),
});

const parsed = envSchema.safeParse(process.env);

// During `next build`, Next.js imports server modules for static analysis before
// any runtime env is available. Skip the throw so the build succeeds; the
// validation will run (and fail loudly) on the first real request instead.
if (process.env.NEXT_PHASE !== "phase-production-build" && !parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check .env / .env.local");
}

export const env = (parsed.data ?? process.env) as z.infer<typeof envSchema>;
