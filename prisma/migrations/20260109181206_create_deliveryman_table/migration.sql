-- CreateTable
CREATE TABLE "deliverymen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "mainPixKey" TEXT NOT NULL,
    "secondPixKey" TEXT,
    "thridPixKey" TEXT,
    "agency" TEXT,
    "account" TEXT,
    "vehicleModel" TEXT,
    "vehiclePlate" TEXT,
    "vehicleColor" TEXT,
    "branchId" TEXT NOT NULL,
    "regionId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverymen_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "deliverymen" ADD CONSTRAINT "deliverymen_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverymen" ADD CONSTRAINT "deliverymen_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
