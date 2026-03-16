/*
  Warnings:

  - Added the required column `additionalTax` to the `payment_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount` to the `payment_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "additionalTax" DECIMAL(16,2) NOT NULL,
ADD COLUMN     "discount" DECIMAL(16,2) NOT NULL,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "taxReason" TEXT;
