import { Role } from "../generated/prisma/index.js";
import type { SubRole } from "../generated/prisma/index.js";

type Identity = {
  role: Role;
};

type ScopedAssignment = {
  subRole: SubRole;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  isActive: boolean;
};

type Scope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
};

export const isAdmin = (identity: Identity): boolean =>
  identity.role === Role.ADMIN;

export const canAccessScope = ({
  identity,
  assignments,
  allowedSubRoles,
  scope,
}: {
  identity: Identity;
  assignments: readonly ScopedAssignment[];
  allowedSubRoles: readonly SubRole[];
  scope: Scope;
}): boolean => {
  if (isAdmin(identity)) return true;

  return assignments.some(
    (assignment) =>
      assignment.isActive &&
      allowedSubRoles.includes(assignment.subRole) &&
      (scope.projectId === undefined ||
        assignment.projectId === scope.projectId) &&
      (scope.centerId === undefined ||
        assignment.centerId === scope.centerId) &&
      (scope.semesterId === undefined ||
        assignment.semesterId === scope.semesterId) &&
      (scope.semesterLevelId === undefined ||
        assignment.semesterLevelId === scope.semesterLevelId),
  );
};
