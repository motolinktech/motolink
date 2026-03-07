-- CreateTable
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "workShiftSlotId" TEXT NOT NULL,
    "deliverymanId" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "logs" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_workShiftSlotId_fkey" FOREIGN KEY ("workShiftSlotId") REFERENCES "work_shift_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_deliverymanId_fkey" FOREIGN KEY ("deliverymanId") REFERENCES "deliverymen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
