import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter no mínimo 32 caracteres (use openssl rand -base64 32)"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  // Parâmetros de agrupamento de relatos (US06). Editáveis no Vercel sem novo build.
  CLUSTER_RADIUS_M: z.coerce.number().int().positive().default(200),
  CLUSTER_WINDOW_MIN: z.coerce.number().int().positive().default(120),
  CLUSTER_THRESHOLD: z.coerce.number().int().min(2).default(3),
  // Web Push / VAPID (RS-TK04). Opcionais para o boot não quebrar em ambientes
  // sem push (CI/test); o dispatcher checa em runtime e degrada silenciosamente.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:contato@rotasegura.local"),
  NOTIFICATION_RADIUS_KM: z.coerce.number().positive().default(2),
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
