import { Role, SubRole } from "../generated/prisma/index.js";
import type {
  Role as RoleType,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type StudentScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
};

type StudentIdentity = Readonly<{
  role: RoleType;
}>;

type StudentAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  isActive: boolean;
}>;

type StudentAuthorizationInput = Readonly<{
  identity: StudentIdentity;
  assignments: readonly StudentAssignment[];
  scope?: StudentScope | null;
}>;

export const hasCompleteStudentScope = (
  scope: StudentScope | null | undefined,
): scope is Required<
  Pick<StudentScope, "projectId" | "centerId" | "semesterId">
> &
  StudentScope =>
  typeof scope?.projectId === "string" &&
  scope.projectId === scope.projectId.trim() &&
  scope.projectId.length > 0 &&
  typeof scope.centerId === "string" &&
  scope.centerId === scope.centerId.trim() &&
  scope.centerId.length > 0 &&
  typeof scope.semesterId === "string" &&
  scope.semesterId === scope.semesterId.trim() &&
  scope.semesterId.length > 0 &&
  (scope.semesterLevelId === undefined ||
    (typeof scope.semesterLevelId === "string" &&
      scope.semesterLevelId === scope.semesterLevelId.trim() &&
      scope.semesterLevelId.length > 0));

const canAccessStudentScope = (
  input: StudentAuthorizationInput,
  allowedSubRoles: readonly SubRoleType[],
  requireSemesterLevel = false,
): boolean => {
  if (input.identity.role !== Role.ADMIN) {
    if (!hasCompleteStudentScope(input.scope)) return false;
    if (requireSemesterLevel && input.scope.semesterLevelId === undefined)
      return false;
  }

  const scope = requireSemesterLevel
    ? (input.scope ?? {})
    : {
        projectId: input.scope?.projectId,
        centerId: input.scope?.centerId,
        semesterId: input.scope?.semesterId,
      };

  return canAccessScope({
    identity: input.identity,
    assignments: input.assignments,
    allowedSubRoles,
    scope,
  });
};

export const canReadContext = (input: StudentAuthorizationInput): boolean =>
  canAccessStudentScope(input, Object.values(SubRole));

export const canReadStudentEnrollment = (
  input: StudentAuthorizationInput,
): boolean =>
  canAccessStudentScope(
    input,
    Object.values(SubRole).filter((subRole) => subRole !== SubRole.EDUCATOR),
  ) || canAccessStudentScope(input, [SubRole.EDUCATOR], true);

export const canManageStudentProfile = (
  input: StudentAuthorizationInput,
): boolean => canAccessStudentScope(input, [SubRole.CENTER_MANAGER]);
