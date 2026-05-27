import "@testing-library/jest-dom/vitest";

// Fallbacks só pra env.ts não quebrar no boot se o .env não tiver JWT_SECRET.
process.env.JWT_SECRET ??= "test-secret-com-32-chars-aaaaaaaaaaaaaaaaa";
process.env.JWT_EXPIRES_IN ??= "1h";
