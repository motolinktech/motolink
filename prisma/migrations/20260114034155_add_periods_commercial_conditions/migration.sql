/*
  Warnings:

  - You are about to drop the column `paymentTermDays` on the `commercial_conditions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "commercial_conditions" DROP COLUMN "paymentTermDays",
ADD COLUMN     "periods" TEXT[] DEFAULT ARRAY[]::TEXT[];
