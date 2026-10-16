ALTER TABLE "CapitalEvent" ADD COLUMN "transferId" TEXT;
CREATE INDEX "CapitalEvent_transferId_idx" ON "CapitalEvent"("transferId");
