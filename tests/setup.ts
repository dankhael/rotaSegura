import "@testing-library/jest-dom/vitest";

// Fallbacks para env vars exigidas pelo validador (src/lib/env.ts) em testes.
// vitest.config.ts já carrega .env via loadEnv; estes ??= apenas garantem que,
// se algum dev ainda não atualizou o .env com JWT_SECRET, os testes não quebrem
// no boot do módulo. NÃO setamos DATABASE_URL aqui — testes de integração
// precisam de um valor real (definido em .env local ou no CI workflow).
process.env.JWT_SECRET ??= "test-secret-com-32-chars-aaaaaaaaaaaaaaaaa";
process.env.JWT_EXPIRES_IN ??= "1h";
