import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
