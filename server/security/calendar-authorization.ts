import { Role, SubRole } from "../generated/prisma/index.js";
import type {
  Role as RoleType,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type CalendarScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
};

type CalendarAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  semesterLevel?: { isActive: boolean } | null;
  isActive: boolean;
}>;

type CalendarAuthorizationInput = Readonly<{
  identity: { role: RoleType };
  assignments: readonly CalendarAssignment[];
  scope?: CalendarScope | null;
}>;

export const hasCompleteCalendarScope = (
  scope: CalendarScope | null | undefined,
): scope is Required<CalendarScope> =>
  typeof scope?.projectId === "string" &&
  scope.projectId.length > 0 &&
  scope.projectId === scope.projectId.trim() &&
  typeof scope.centerId === "string" &&
  scope.centerId.length > 0 &&
  scope.centerId === scope.centerId.trim() &&
  typeof scope.semesterId === "string" &&
  scope.semesterId.length > 0 &&
  scope.semesterId === scope.semesterId.trim();

const canAccessCalendar = (
  input: CalendarAuthorizationInput,
  allowedSubRoles: readonly SubRoleType[],
): boolean => {
  if (input.identity.role !== Role.ADMIN &&
      !hasCompleteCalendarScope(input.scope)) {
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

export const canReadCalendar = (
  input: CalendarAuthorizationInput,
): boolean =>
  canAccessCalendar(input, [SubRole.CENTER_MANAGER, SubRole.EDUCATOR]);

export const canManageCalendar = (
  input: CalendarAuthorizationInput,
): boolean =>
  canAccessCalendar(input, [SubRole.CENTER_MANAGER]);
