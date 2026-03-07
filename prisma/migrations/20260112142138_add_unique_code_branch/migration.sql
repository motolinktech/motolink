/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `branches` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `branches` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
