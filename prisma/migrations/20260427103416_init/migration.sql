-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis_tiger_geocoder";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- CreateTable
CREATE TABLE "SupportPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "location" geography(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportPoint_location_idx" ON "SupportPoint" USING GIST ("location");
