/*
  Warnings:

  - You are about to drop the column `documents` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "documents",
ADD COLUMN     "files" JSONB[] DEFAULT ARRAY[]::JSONB[];
