-- AlterTable
ALTER TABLE "deliverymen" ADD COLUMN     "files" TEXT[] DEFAULT ARRAY[]::TEXT[];
