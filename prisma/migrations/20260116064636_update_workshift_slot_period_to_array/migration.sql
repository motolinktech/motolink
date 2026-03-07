/*
  Warnings:

  - The `period` column on the `work_shift_slots` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "work_shift_slots" DROP COLUMN "period",
ADD COLUMN     "period" TEXT[] DEFAULT ARRAY['daytime']::TEXT[];
