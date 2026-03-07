-- AlterTable
ALTER TABLE "work_shift_slots" ADD COLUMN     "deliverymanPerDeliveryDay" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliverymanPerDeliveryNight" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedQuantityDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guaranteedQuantityNight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isWeekendRate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentForm" TEXT NOT NULL DEFAULT 'DAILY';
