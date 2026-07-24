CREATE TYPE "EmailJobStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED'
);

CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "messageId" TEXT NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailJob_attempts_nonnegative" CHECK ("attempts" >= 0),
    CONSTRAINT "EmailJob_max_attempts_positive" CHECK ("maxAttempts" > 0)
);

CREATE UNIQUE INDEX "EmailJob_dedupeKey_key"
ON "EmailJob"("dedupeKey");

CREATE UNIQUE INDEX "EmailJob_messageId_key"
ON "EmailJob"("messageId");

CREATE INDEX "EmailJob_status_availableAt_idx"
ON "EmailJob"("status", "availableAt");

CREATE INDEX "EmailJob_status_lockedAt_idx"
ON "EmailJob"("status", "lockedAt");
