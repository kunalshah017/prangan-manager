-- Expand: record when a role assignment stops being active, so past roles can
-- be shown with their dates. Existing code ignores the new column.
ALTER TABLE "UserRoleAssignments" ADD COLUMN "endedAt" TIMESTAMP(3);

-- Backfill: for assignments already inactive, the last update is the best
-- available record of when they ended.
UPDATE "UserRoleAssignments"
SET "endedAt" = "updatedAt"
WHERE "isActive" = false AND "endedAt" IS NULL;

-- Attendance (and the pay history built on it) must never disappear because
-- its assignment row is deleted. NO ACTION is checked at the end of the
-- statement, so deleting a whole user still cascades through both tables.
ALTER TABLE "UserAttendance" DROP CONSTRAINT "UserAttendance_roleAssignmentId_fkey";
ALTER TABLE "UserAttendance" ADD CONSTRAINT "UserAttendance_roleAssignmentId_fkey"
  FOREIGN KEY ("roleAssignmentId") REFERENCES "UserRoleAssignments"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;
