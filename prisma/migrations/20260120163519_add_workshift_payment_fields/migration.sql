-- AlterTable
ALTER TABLE "work_shift_slots" ADD COLUMN     "deliverymanPaymentType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "deliverymenPaymentValue" TEXT NOT NULL DEFAULT '';
