-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "regionId" TEXT,
    "groupId" TEXT,
    "contactName" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_conditions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "paymentForm" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
    "deliveryAreaKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isMotolinkCovered" BOOLEAN NOT NULL DEFAULT false,
    "guaranteedDay" INTEGER NOT NULL DEFAULT 0,
    "guaranteedDayWeekend" INTEGER NOT NULL DEFAULT 0,
    "guaranteedNight" INTEGER NOT NULL DEFAULT 0,
    "guaranteedNightWeekend" INTEGER NOT NULL DEFAULT 0,
    "clientDailyDay" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientDailyDayWknd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientDailyNight" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientDailyNightWknd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientPerDelivery" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientAdditionalKm" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanDailyDay" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanDailyDayWknd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanDailyNight" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanDailyNightWknd" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanPerDelivery" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deliverymanAdditionalKm" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commercial_conditions_clientId_key" ON "commercial_conditions"("clientId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_conditions" ADD CONSTRAINT "commercial_conditions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
