-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('UPDATE', 'TASK');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "expiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "key" TEXT,
ADD COLUMN     "kind" "NotificationKind" NOT NULL DEFAULT 'UPDATE';

-- CreateIndex
CREATE INDEX "Notification_key_idx" ON "Notification"("key");

