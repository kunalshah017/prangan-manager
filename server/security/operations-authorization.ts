import { Role, SubRole } from "../generated/prisma/index.js";
import type {
  Role as RoleType,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type OperationsScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
};

type OperationsAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  semesterLevel?: { isActive: boolean } | null;
  isActive: boolean;
}>;

type OperationsAuthorizationInput = Readonly<{
  identity: { role: RoleType };
  assignments: readonly OperationsAssignment[];
  scope?: OperationsScope | null;
}>;

export const hasCompleteOperationsScope = (
  scope: OperationsScope | null | undefined,
): scope is Required<OperationsScope> =>
  typeof scope?.projectId === "string" &&
  scope.projectId.length > 0 &&
  scope.projectId === scope.projectId.trim() &&
  typeof scope.centerId === "string" &&
  scope.centerId.length > 0 &&
  scope.centerId === scope.centerId.trim() &&
  typeof scope.semesterId === "string" &&
  scope.semesterId.length > 0 &&
  scope.semesterId === scope.semesterId.trim();

const canAccessOperations = (
  input: OperationsAuthorizationInput,
  allowedSubRoles: readonly SubRoleType[],
): boolean => {
  if (input.identity.role !== Role.ADMIN &&
      !hasCompleteOperationsScope(input.scope)) {
    return false;
  }

  return canAccessScope({
    identity: input.identity,
    assignments: input.assignments,
    allowedSubRoles,
    scope: {
      projectId: input.scope?.projectId,
      centerId: input.scope?.centerId,
      semesterId: input.scope?.semesterId,
    },
  });
};

export const canReadOperations = (
  input: OperationsAuthorizationInput,
): boolean =>
  canAccessOperations(input, [SubRole.CENTER_MANAGER, SubRole.EDUCATOR]);

export const canManageOperations = (
  input: OperationsAuthorizationInput,
): boolean =>
  canAccessOperations(input, [SubRole.CENTER_MANAGER]);

