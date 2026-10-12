-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('open', 'assigned', 'loading', 'in_transit', 'arrived', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'taken');

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'open',
    "step" INTEGER NOT NULL DEFAULT 1,
    "driverId" TEXT,
    "waybillNo" TEXT NOT NULL,
    "trackCode" TEXT NOT NULL,
    "goods" TEXT NOT NULL,
    "weightText" TEXT,
    "fromTitle" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "fromPhone" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toTitle" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "toContact" TEXT,
    "toPhone" TEXT,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "distanceKm" INTEGER,
    "whenText" TEXT,
    "notes" JSONB,
    "internalNote" TEXT,
    "fareRial" BIGINT NOT NULL,
    "driverFeeBp" INTEGER NOT NULL,
    "feeSource" TEXT NOT NULL DEFAULT 'default',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOffer" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "fareRial" BIGINT NOT NULL,
    "driverFeeBp" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DispatchOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "clientAt" TIMESTAMP(3) NOT NULL,
    "serverAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "photoFileId" TEXT,
    "clientSeq" INTEGER,

    CONSTRAINT "TripEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_waybillNo_key" ON "Trip"("waybillNo");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_trackCode_key" ON "Trip"("trackCode");

-- CreateIndex
CREATE INDEX "Trip_status_createdAt_idx" ON "Trip"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Trip_driverId_status_idx" ON "Trip"("driverId", "status");

-- CreateIndex
CREATE INDEX "DispatchOffer_driverId_status_expiresAt_idx" ON "DispatchOffer"("driverId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchOffer_tripId_driverId_key" ON "DispatchOffer"("tripId", "driverId");

-- CreateIndex
CREATE INDEX "TripEvent_tripId_idx" ON "TripEvent"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripEvent_tripId_step_key" ON "TripEvent"("tripId", "step");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

