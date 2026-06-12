-- RS-TK04: tabela de inscrições Web Push.
-- Identidade por deviceId (mesmo UUID localStorage usado em reports). userId
-- coberto para o caso admin. location alimenta o filtro geoespacial do disparo.

CREATE TABLE "push_subscriptions" (
  "id"        TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "deviceId"  TEXT,
  "userId"    TEXT,
  "latitude"  DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "location"  geography(Point, 4326) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key"
  ON "push_subscriptions" ("endpoint");

CREATE INDEX "push_subscriptions_location_idx"
  ON "push_subscriptions" USING GIST ("location");

CREATE INDEX "push_subscriptions_deviceId_idx"
  ON "push_subscriptions" ("deviceId");

CREATE INDEX "push_subscriptions_userId_idx"
  ON "push_subscriptions" ("userId");
