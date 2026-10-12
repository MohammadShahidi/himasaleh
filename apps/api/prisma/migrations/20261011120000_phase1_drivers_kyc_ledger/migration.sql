-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('draft', 'submitted', 'needs_fix', 'approved', 'blocked');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('pickup', 'khavar', 'kamyonet', 'single_truck', 'ten_wheeler', 'trailer');

-- CreateEnum
CREATE TYPE "VehicleBody" AS ENUM ('flatbed', 'sided', 'dump', 'covered');

-- CreateEnum
CREATE TYPE "OwnerRelation" AS ENUM ('father', 'mother', 'spouse', 'brother', 'sister', 'child', 'partner', 'employer', 'other');

-- CreateEnum
CREATE TYPE "KycSubject" AS ENUM ('driver', 'owner');

-- CreateEnum
CREATE TYPE "KycKind" AS ENUM ('national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet', 'license', 'selfie_video', 'owner_national_id_front', 'owner_national_id_back', 'owner_authorization', 'owner_video');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "licenseNo" TEXT,
    "refCode" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'draft',
    "province" TEXT,
    "city" TEXT,
    "serviceCities" TEXT[],
    "address" TEXT,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "body" "VehicleBody" NOT NULL,
    "capacityTon" INTEGER,
    "year" INTEGER,
    "plate1" TEXT NOT NULL,
    "plateLetter" TEXT NOT NULL,
    "plate2" TEXT NOT NULL,
    "plate3" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleOwner" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" "OwnerRelation" NOT NULL,
    "relationOther" TEXT,
    "videoTokenHash" TEXT,
    "videoLinkSentAt" TIMESTAMP(3),
    "videoReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycItem" (
    "id" TEXT NOT NULL,
    "subject" "KycSubject" NOT NULL,
    "driverId" TEXT,
    "ownerId" TEXT,
    "kind" "KycKind" NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "scriptSnapshot" TEXT,
    "shahkarResult" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTxn" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT,
    "idempotencyKey" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amountRial" BIGINT NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBalance" (
    "account" TEXT NOT NULL,
    "balanceRial" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("account")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE INDEX "DriverProfile_status_submittedAt_idx" ON "DriverProfile"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "DriverProfile_nationalId_idx" ON "DriverProfile"("nationalId");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOwner_vehicleId_key" ON "VehicleOwner"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOwner_videoTokenHash_key" ON "VehicleOwner"("videoTokenHash");

-- CreateIndex
CREATE INDEX "KycItem_driverId_kind_createdAt_idx" ON "KycItem"("driverId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "KycItem_ownerId_kind_createdAt_idx" ON "KycItem"("ownerId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "KycItem_status_createdAt_idx" ON "KycItem"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTxn_idempotencyKey_key" ON "LedgerTxn"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerTxn_ref_idx" ON "LedgerTxn"("ref");

-- CreateIndex
CREATE INDEX "LedgerEntry_account_idx" ON "LedgerEntry"("account");

-- CreateIndex
CREATE INDEX "LedgerEntry_txnId_idx" ON "LedgerEntry"("txnId");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwner" ADD CONSTRAINT "VehicleOwner_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycItem" ADD CONSTRAINT "KycItem_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycItem" ADD CONSTRAINT "KycItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "VehicleOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycItem" ADD CONSTRAINT "KycItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES "LedgerTxn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

