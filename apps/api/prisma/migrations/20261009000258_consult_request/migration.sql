-- CreateTable
CREATE TABLE "ConsultRequest" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "ctx" TEXT,
    "note" TEXT,
    "ip" TEXT NOT NULL,
    "handledAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultRequest_handledAt_createdAt_idx" ON "ConsultRequest"("handledAt", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultRequest_phone_createdAt_idx" ON "ConsultRequest"("phone", "createdAt");
