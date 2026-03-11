-- AlterTable
ALTER TABLE "commercial_conditions" ADD COLUMN     "guaranteedDayTax" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedDayWeekendTax" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedNightTax" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedNightWeekendTax" DECIMAL(16,2) NOT NULL DEFAULT 0;
