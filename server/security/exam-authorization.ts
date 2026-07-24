import { Role, SubRole } from "../generated/prisma/index.js";
import type {
  Role as RoleType,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type ExamScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
};

type ExamIdentity = Readonly<{
  role: RoleType;
}>;

type ExamAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  isActive: boolean;
}>;

type ExamAuthorizationInput = Readonly<{
  identity: ExamIdentity;
  assignments: readonly ExamAssignment[];
  scope?: ExamScope | null;
}>;

export const hasCompleteExamScope = (
  scope: ExamScope | null | undefined,
): scope is Required<Pick<ExamScope, "projectId" | "centerId" | "semesterId">> &
  ExamScope =>
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

const canAccessExamScope = (
  input: ExamAuthorizationInput,
  allowedSubRoles: readonly SubRoleType[],
  requireSemesterLevel = false,
): boolean => {
  if (input.identity.role !== Role.ADMIN) {
    if (!hasCompleteExamScope(input.scope)) return false;
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

export const canReadExam = (input: ExamAuthorizationInput): boolean =>
  canAccessExamScope(
    input,
    Object.values(SubRole).filter((subRole) => subRole !== SubRole.EDUCATOR),
  ) ||
  (input.identity.role !== Role.ADMIN &&
    canAccessExamScope(input, [SubRole.EDUCATOR], true));

export const canManageExam = (input: ExamAuthorizationInput): boolean =>
  canAccessExamScope(input, [
    SubRole.CENTER_MANAGER,
    SubRole.CURRICULUM_MENTOR,
  ]);

export const canWriteScore = (input: ExamAuthorizationInput): boolean =>
  canAccessExamScope(input, [
    SubRole.CENTER_MANAGER,
    SubRole.CURRICULUM_MENTOR,
  ]) ||
  (input.identity.role !== Role.ADMIN &&
    canAccessExamScope(input, [SubRole.EDUCATOR], true));
