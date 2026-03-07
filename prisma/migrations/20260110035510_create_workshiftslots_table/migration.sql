-- CreateTable
CREATE TABLE "work_shift_slots" (
    "id" TEXT NOT NULL,
    "deliverymanId" TEXT,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "auditStatus" TEXT NOT NULL,
    "logs" JSONB[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_shift_slots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "work_shift_slots" ADD CONSTRAINT "work_shift_slots_deliverymanId_fkey" FOREIGN KEY ("deliverymanId") REFERENCES "deliverymen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_shift_slots" ADD CONSTRAINT "work_shift_slots_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
