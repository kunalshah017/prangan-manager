import type { User } from "@/types/api";

export type Permission =
  | "workspace.view"
  | "students.read"
  | "students.manage"
  | "staffAttendance.read"
  | "staffAttendance.write"
  | "studentAttendance.read"
  | "studentAttendance.write"
  | "studentAttendance.holiday"
  | "curriculum.read"
  | "curriculum.manage"
  | "curriculum.progress.write"
  | "exams.read"
  | "exams.manage"
  | "scores.read"
  | "scores.write"
  | "users.manage";

export type WorkspaceContext = {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
};

type Assignment = NonNullable<User["roleAssignments"]>[number];

const rolePermissions: Record<Assignment["subRole"], readonly Permission[]> = {
  CENTER_MANAGER: [
    "workspace.view",
    "students.read",
    "students.manage",
    "staffAttendance.read",
    "staffAttendance.write",
    "studentAttendance.read",
    "studentAttendance.write",
    "studentAttendance.holiday",
    "curriculum.read",
    "curriculum.progress.write",
    "exams.read",
    "exams.manage",
    "scores.read",
    "scores.write",
  ],
  EDUCATOR: [
    "workspace.view",
    "students.read",
    "studentAttendance.read",
    "studentAttendance.write",
    "curriculum.read",
    "curriculum.progress.write",
    "exams.read",
    "scores.read",
    "scores.write",
  ],
  CURRICULUM_MENTOR: [
    "workspace.view",
    "curriculum.read",
    "curriculum.manage",
    "curriculum.progress.write",
    "exams.read",
    "exams.manage",
    "scores.read",
    "scores.write",
  ],
  TECH: [],
  TRAINING_DEVELOPMENT: [],
  RECRUITMENT: [],
  GROWTH_DEVELOPMENT: [],
};

const requiresLevel = (permission: Permission): boolean =>
  [
    "students.read",
    "studentAttendance.read",
    "studentAttendance.write",
    "curriculum.read",
    "curriculum.progress.write",
    "exams.read",
    "scores.read",
    "scores.write",
  ].includes(permission);

const matchesContext = (
  assignment: Assignment,
  context: WorkspaceContext,
): boolean => {
  if (!assignment.isActive) return false;

  for (const key of ["projectId", "centerId", "semesterId"] as const) {
    if (context[key] && assignment[key] !== context[key]) return false;
  }

  return true;
};

const matchesLevel = (
  assignment: Assignment,
  permission: Permission,
  context: WorkspaceContext,
): boolean => {
  if (assignment.subRole !== "EDUCATOR") return true;
  if (!requiresLevel(permission)) return true;
  return (
    !context.semesterLevelId ||
    assignment.semesterLevelId === context.semesterLevelId
  );
};

export const can = (
  user: User | null | undefined,
  permission: Permission,
  context: WorkspaceContext = {},
): boolean => {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  return (
    user.roleAssignments?.some(
      (assignment) =>
        rolePermissions[assignment.subRole].includes(permission) &&
        matchesContext(assignment, context) &&
        matchesLevel(assignment, permission, context),
    ) ?? false
  );
};

export const getAllowedAssignments = (
  user: User | null | undefined,
  permission: Permission,
): Assignment[] => {
  if (!user || user.role === "ADMIN") return [];

  return (user.roleAssignments ?? []).filter(
    (assignment) =>
      assignment.isActive &&
      rolePermissions[assignment.subRole].includes(permission),
  );
};
