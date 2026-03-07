-- AlterTable
ALTER TABLE "events" ADD COLUMN     "branches" TEXT[] DEFAULT ARRAY[]::TEXT[];
