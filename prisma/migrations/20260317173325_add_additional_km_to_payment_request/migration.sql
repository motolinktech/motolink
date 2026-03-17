-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "additionalKm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliverymanAdditionalKm" DECIMAL(16,2) NOT NULL DEFAULT 0,
ALTER COLUMN "additionalTax" SET DEFAULT 0;
