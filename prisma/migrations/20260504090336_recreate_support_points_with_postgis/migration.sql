/*
  DESTRUTIVA: dropa a tabela "SupportPoint" criada pela migration inicial e
  recria como "support_points" com colunas latitude/longitude e índice GIST
  sobre a coluna geography. Qualquer dado existente em "SupportPoint" será
  PERDIDO ao aplicar esta migration. Seguro neste branch porque a tabela
  ainda não recebeu dados em produção.
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
