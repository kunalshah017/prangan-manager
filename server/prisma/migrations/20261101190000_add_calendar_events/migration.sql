CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'EVENT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "CalendarEvent_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Projects"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "CalendarEvent_centerId_fkey"
        FOREIGN KEY ("centerId") REFERENCES "Centers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "CalendarEvent_semesterId_fkey"
        FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CalendarEvent_projectId_centerId_semesterId_startDate_idx"
ON "CalendarEvent"("projectId", "centerId", "semesterId", "startDate");

CREATE INDEX "CalendarEvent_semesterId_endDate_idx"
ON "CalendarEvent"("semesterId", "endDate");
