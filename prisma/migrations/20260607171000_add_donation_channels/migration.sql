CREATE TABLE "donation_channels" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "channelValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_channels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "donation_channels_channelType_idx" ON "donation_channels"("channelType");
