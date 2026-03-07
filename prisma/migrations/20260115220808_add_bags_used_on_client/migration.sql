/*
  Warnings:

  - You are about to drop the column `garanteedPeriods` on the `commercial_conditions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "commercial_conditions" DROP COLUMN "garanteedPeriods",
ADD COLUMN     "bagsAllocated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedPeriods" TEXT[] DEFAULT ARRAY[]::TEXT[];
