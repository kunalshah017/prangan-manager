import { can, type Permission, type WorkspaceContext } from "@/lib/access";
import type { User } from "@/types/api";

export type DashboardActionIcon =
  | "users"
  | "calendar-check"
  | "calendar-days"
  | "book-open"
  | "clipboard-list"
  | "library"
  | "user-check"
  | "wallet-cards";

export interface DashboardAction {
  label: string;
  mobileLabel: string;
  description: string;
  href: string;
  icon: DashboardActionIcon;
}

export interface DashboardActionGroup {
  label: string;
  actions: DashboardAction[];
}

export interface DashboardModel {
  roleLabel: string;
  assignedSemesterLevelId?: string;
  /** @deprecated Use assignedSemesterLevelId. */
  assignedLevel?: NonNullable<
    NonNullable<User["roleAssignments"]>[number]["level"]
  >;
  capabilities: {
    markStudentAttendance: boolean;
    markStaffAttendance: boolean;
  };
  visibility: {
    students: boolean;
    studentAttendance: boolean;
    staff: boolean;
    staffAttendance: boolean;
    curriculum: boolean;
    exams: boolean;
  };
  actionGroups: DashboardActionGroup[];
}

type ExactContext = Required<
  Pick<WorkspaceContext, "projectId" | "centerId" | "semesterId">
>;

const action = (
  user: User | null | undefined,
  permission: Permission,
  context: ExactContext,
  label: string,
  mobileLabel: string,
  description: string,
  suffix: string,
  icon: DashboardActionIcon,
): DashboardAction | null =>
  can(user, permission, context)
    ? {
        label,
        mobileLabel,
        description,
        href: suffix.startsWith("/")
          ? `/projects/${context.projectId}/centers/${context.centerId}/semesters/${context.semesterId}/dashboard${suffix}`
          : suffix,
        icon,
      }
    : null;

const compact = <T>(items: Array<T | null>): T[] =>
  items.filter((item): item is T => item !== null);

export function buildDashboardModel(
  user: User | null | undefined,
  context: ExactContext,
): DashboardModel {
  const assignment = user?.roleAssignments?.find(
    (item) =>
      item.isActive &&
      item.projectId === context.projectId &&
      item.centerId === context.centerId &&
      item.semesterId === context.semesterId,
  );
  const assignedLevel =
    assignment?.subRole === "EDUCATOR" ? assignment.level : undefined;
  const assignedSemesterLevelId =
    assignment?.subRole === "EDUCATOR"
      ? (assignment.semesterLevelId ?? undefined)
      : undefined;
  const students = can(user, "students.read", context);
  const studentAttendance =
    can(user, "studentAttendance.read", context) ||
    can(user, "studentAttendance.write", context);
  const staffAttendance =
    can(user, "staffAttendance.read", context) ||
    can(user, "staffAttendance.write", context);
  const curriculum = can(user, "curriculum.read", context);
  const exams = can(user, "exams.read", context);
  const canManageSemesterUsers =
    user?.role === "ADMIN" ||
    user?.roleAssignments?.some(
      (item) =>
        item.isActive &&
        item.subRole === "CENTER_MANAGER" &&
        item.projectId === context.projectId &&
        item.centerId === context.centerId &&
        item.semesterId === context.semesterId,
    );

  const actionGroups = [
    {
      label: "Student operations",
      actions: compact([
        action(
          user,
          "students.read",
          context,
          "View students",
          "Students",
          "Review enrolled students and their levels.",
          "/students",
          "users",
        ),
        action(
          user,
          "studentAttendance.write",
          context,
          "Mark student attendance",
          "Mark students",
          "Record attendance for the current teaching day.",
          "/student-attendance/mark",
          "calendar-check",
        ),
        action(
          user,
          "studentAttendance.read",
          context,
          "View student attendance",
          "Student records",
          "Review attendance history and patterns.",
          "/student-attendance/view",
          "calendar-days",
        ),
      ]),
    },
    {
      label: "Academics",
      actions: compact([
        action(
          user,
          "curriculum.read",
          context,
          "Curriculum",
          "Curriculum",
          "Track syllabus topics and classroom progress.",
          "/syllabus",
          "book-open",
        ),
        action(
          user,
          "exams.read",
          context,
          "Exams",
          "Exams",
          "Review assessments and student scores.",
          "/exams",
          "clipboard-list",
        ),
        {
          label: "Library",
          mobileLabel: "Library",
          description: "Browse learning books and classroom resources.",
          href: "/library",
          icon: "library",
        } satisfies DashboardAction,
      ]),
    },
    {
      label: "Staff operations",
      actions: compact([
        canManageSemesterUsers
          ? action(
              user,
              "staffAttendance.read",
              context,
              "Semester users",
              "Team settings",
              "Manage semester roles and daily remuneration.",
              "/users",
              "users",
            )
          : null,
        action(
          user,
          "staffAttendance.write",
          context,
          "Mark staff attendance",
          "Mark staff",
          "Record educator and manager attendance.",
          "/attendance/mark",
          "user-check",
        ),
        action(
          user,
          "staffAttendance.read",
          context,
          "View staff attendance",
          "Staff records",
          "Review staff attendance history.",
          "/attendance/view",
          "calendar-days",
        ),
        action(
          user,
          "staffAttendance.read",
          context,
          "Remuneration",
          "Pay",
          "Review attendance-linked remuneration.",
          "/attendance/remuneration",
          "wallet-cards",
        ),
      ]),
    },
  ].filter((group) => group.actions.length > 0);

  const roleLabels: Record<string, string> = {
    CENTER_MANAGER: "Center Manager workspace",
    EDUCATOR: "Educator workspace",
    CURRICULUM_MENTOR: "Curriculum Mentor workspace",
  };

  return {
    roleLabel:
      user?.role === "ADMIN"
        ? "Admin workspace"
        : roleLabels[assignment?.subRole || ""] || "Semester workspace",
    assignedSemesterLevelId,
    assignedLevel,
    capabilities: {
      markStudentAttendance: can(user, "studentAttendance.write", context),
      markStaffAttendance: can(user, "staffAttendance.write", context),
    },
    visibility: {
      students,
      studentAttendance,
      staff: staffAttendance,
      staffAttendance,
      curriculum,
      exams,
    },
    actionGroups,
  };
}
