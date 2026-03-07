-- CreateTable
CREATE TABLE "history_traces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "user" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_traces_pkey" PRIMARY KEY ("id")
);
