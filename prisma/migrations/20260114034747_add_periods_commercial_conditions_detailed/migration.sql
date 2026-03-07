/*
  Warnings:

  - You are about to drop the column `periods` on the `commercial_conditions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "commercial_conditions" DROP COLUMN "periods",
ADD COLUMN     "dailyPeriods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "garanteedPeriods" TEXT[] DEFAULT ARRAY[]::TEXT[];
