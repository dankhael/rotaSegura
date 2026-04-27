import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type HealthStatus = {
  status: "ok";
  db: "connected" | "disconnected";
  timestamp: string;
};

export async function GET() {
  let dbStatus: HealthStatus["db"] = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  const body: HealthStatus = {
    status: "ok",
    db: dbStatus,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
