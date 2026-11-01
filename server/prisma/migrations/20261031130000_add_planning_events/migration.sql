CREATE TABLE "PlanningItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "activityType" TEXT NOT NULL DEFAULT 'GENERAL',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanningItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlanningItem_projectId_centerId_semesterId_startAt_idx" ON "PlanningItem"("projectId", "centerId", "semesterId", "startAt");
CREATE TABLE "ManagedEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "centerId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "archiveNotes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManagedEvent_projectId_centerId_semesterId_eventDate_idx" ON "ManagedEvent"("projectId", "centerId", "semesterId", "eventDate");
