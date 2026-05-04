// tests/integration-setup.ts

import { prisma } from "@/lib/db";

export async function setup() {
  await prisma.$executeRaw`DELETE FROM "SupportPoint"`;
}

export async function teardown() {
  await prisma.$executeRaw`DELETE FROM "SupportPoint"`;
  await prisma.$disconnect();
}
