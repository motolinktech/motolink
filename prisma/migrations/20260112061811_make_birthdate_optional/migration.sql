/*
  Warnings:

  - The `documents` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "birthDate" DROP NOT NULL,
DROP COLUMN "documents",
ADD COLUMN     "documents" JSONB[] DEFAULT ARRAY[]::JSONB[];
