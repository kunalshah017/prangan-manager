-- DropIndex
DROP INDEX "UserRoleAssignments_userId_subRole_projectId_centerId_semes_key";

-- CreateIndex
CREATE INDEX "UserRoleAssignments_userId_subRole_projectId_centerId_semes_idx" ON "UserRoleAssignments"("userId", "subRole", "projectId", "centerId", "semesterId", "isActive");
