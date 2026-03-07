-- CreateTable
CREATE TABLE "client_blocks" (
    "id" TEXT NOT NULL,
    "deliverymanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_blocks_clientId_deliverymanId_key" ON "client_blocks"("clientId", "deliverymanId");

-- AddForeignKey
ALTER TABLE "client_blocks" ADD CONSTRAINT "client_blocks_deliverymanId_fkey" FOREIGN KEY ("deliverymanId") REFERENCES "deliverymen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_blocks" ADD CONSTRAINT "client_blocks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
