import "@testing-library/jest-dom/vitest";

// Fallbacks só pra env.ts não quebrar no boot quando o .env não está presente.
process.env.JWT_SECRET ??= "test-secret-com-32-chars-aaaaaaaaaaaaaaaaa";
process.env.JWT_EXPIRES_IN ??= "1h";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
