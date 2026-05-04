/*
  Warnings:

  - You are about to drop the `SupportPoint` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SupportPoint";

-- CreateTable
CREATE TABLE "support_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_points_location_idx" ON "support_points" USING GIST ("location");
