import { SubRole } from "../generated/prisma/index.js";
import type {
  Role,
  SubRole as SubRoleType,
} from "../generated/prisma/index.js";
import { canAccessScope } from "./authorization.js";

export type AttendanceScope = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
};

type AttendanceIdentity = Readonly<{
  role: Role;
}>;

type AttendanceAssignment = Readonly<{
  subRole: SubRoleType;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  isActive: boolean;
}>;

type AttendanceAuthorizationInput = Readonly<{
  identity: AttendanceIdentity;
  assignments: readonly AttendanceAssignment[];
  scope?: AttendanceScope | null;
}>;

export const hasCompleteAttendanceScope = (
  scope: AttendanceScope | null | undefined,
): scope is Required<AttendanceScope> =>
  typeof scope?.projectId === "string" &&
  scope.projectId === scope.projectId.trim() &&
  scope.projectId.length > 0 &&
  typeof scope.centerId === "string" &&
  scope.centerId === scope.centerId.trim() &&
  scope.centerId.length > 0 &&
  typeof scope.semesterId === "string" &&
  scope.semesterId === scope.semesterId.trim() &&
  scope.semesterId.length > 0;

export const canManageUserAttendance = (
  input: AttendanceAuthorizationInput,
): boolean =>
  canAccessScope({
    identity: input.identity,
    assignments: input.assignments,
    allowedSubRoles: [SubRole.CENTER_MANAGER],
    scope: input.scope ?? {},
  });

export const canManageStudentAttendance = (
  input: AttendanceAuthorizationInput,
): boolean =>
  canAccessScope({
    identity: input.identity,
    assignments: input.assignments,
    allowedSubRoles: [SubRole.CENTER_MANAGER, SubRole.EDUCATOR],
    scope: input.scope ?? {},
  });
