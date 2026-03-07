/*
  Warnings:

  - A unique constraint covering the columns `[clientId,plannedDate,period]` on the table `plannings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteToken]` on the table `work_shift_slots` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "plannings_clientId_plannedDate_key";

-- AlterTable
ALTER TABLE "plannings" ADD COLUMN     "period" TEXT NOT NULL DEFAULT 'diurno';

-- AlterTable
ALTER TABLE "work_shift_slots" ADD COLUMN     "checkInAt" TIMESTAMP(3),
ADD COLUMN     "checkOutAt" TIMESTAMP(3),
ADD COLUMN     "deliverymanAmountDay" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliverymanAmountNight" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteSentAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "isFreelancer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "period" TEXT NOT NULL DEFAULT 'diurno',
ADD COLUMN     "trackingConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackingConnectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "plannings_clientId_plannedDate_period_key" ON "plannings"("clientId", "plannedDate", "period");

-- CreateIndex
CREATE UNIQUE INDEX "work_shift_slots_inviteToken_key" ON "work_shift_slots"("inviteToken");

-- CreateIndex
CREATE INDEX "work_shift_slots_clientId_shiftDate_idx" ON "work_shift_slots"("clientId", "shiftDate");

-- CreateIndex
CREATE INDEX "work_shift_slots_deliverymanId_shiftDate_idx" ON "work_shift_slots"("deliverymanId", "shiftDate");

-- CreateIndex
CREATE INDEX "work_shift_slots_inviteToken_idx" ON "work_shift_slots"("inviteToken");
