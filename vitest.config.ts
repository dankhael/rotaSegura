import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Vitest não carrega .env em process.env por padrão. Os testes de integração
// (support-points, occurrences) exigem DATABASE_URL e o endpoint /api/auth/login
// exige JWT_SECRET — então populamos manualmente, com fallback para o ambiente
// real (CI exporta as vars no workflow).
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    fileParallelism: false,
    css: false,
    env,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
