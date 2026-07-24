import { Role, SubRole } from "../generated/prisma/index.js";
import type {
  Role as RoleType,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type SyllabusScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
};

type SyllabusIdentity = Readonly<{
  role: RoleType;
}>;

type SyllabusAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  isActive: boolean;
}>;

type SyllabusAuthorizationInput = Readonly<{
  identity: SyllabusIdentity;
  assignments: readonly SyllabusAssignment[];
  scope?: SyllabusScope | null;
}>;

export const hasCompleteSyllabusScope = (
  scope: SyllabusScope | null | undefined,
): scope is Required<
  Pick<SyllabusScope, "projectId" | "centerId" | "semesterId">
> &
  SyllabusScope =>
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

const canAccessSyllabusScope = (
  input: SyllabusAuthorizationInput,
  allowedSubRoles: readonly SubRoleType[],
  requireSemesterLevel = false,
): boolean => {
  if (input.identity.role !== Role.ADMIN) {
    if (!hasCompleteSyllabusScope(input.scope)) return false;
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

const managementSubRoles = [
  SubRole.CENTER_MANAGER,
  SubRole.CURRICULUM_MENTOR,
] as const;

export const canReadSyllabus = (input: SyllabusAuthorizationInput): boolean =>
  canAccessSyllabusScope(
    input,
    Object.values(SubRole).filter((subRole) => subRole !== SubRole.EDUCATOR),
  ) ||
  (input.identity.role !== Role.ADMIN &&
    canAccessSyllabusScope(input, [SubRole.EDUCATOR], true));

export const canManageSyllabus = (input: SyllabusAuthorizationInput): boolean =>
  canAccessSyllabusScope(input, managementSubRoles);

export const canUpdateTopicStatus = (
  input: SyllabusAuthorizationInput,
): boolean =>
  canAccessSyllabusScope(input, managementSubRoles) ||
  (input.identity.role !== Role.ADMIN &&
    canAccessSyllabusScope(input, [SubRole.EDUCATOR], true));
