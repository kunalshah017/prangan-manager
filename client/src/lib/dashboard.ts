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
  capabilities: {
    markStudentAttendance: boolean;
    markStaffAttendance: boolean;
    manageLevels: boolean;
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

type BankDetails = Pick<
  User,
  | "bankAccountNumber"
  | "bankAccountName"
  | "bankIfsc"
  | "bankName"
  | "bankBranch"
  | "upiId"
>;

export const hasCompleteBankDetails = (
  user: BankDetails | null | undefined,
) =>
  Boolean(
    user &&
      [
        user.bankAccountNumber,
        user.bankAccountName,
        user.bankIfsc,
        user.bankName,
        user.bankBranch,
        user.upiId,
      ].every((value) => value?.trim()),
  );

const action = (
  user: User | null | undefined,
  permission: Permission,
  context: ExactContext,
  label: string,
  mobileLabel: string,
  suffix: string,
  icon: DashboardActionIcon,
): DashboardAction | null =>
  can(user, permission, context)
    ? {
        label,
        mobileLabel,
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
  const actionGroups = [
    {
      label: "Students",
      actions: compact([
        action(
          user,
          "students.read",
          context,
          "View students",
          "Students",
          "/students",
          "users",
        ),
        action(
          user,
          "studentAttendance.write",
          context,
          "Mark student attendance",
          "Mark students",
          "/student-attendance/mark",
          "calendar-check",
        ),
        action(
          user,
          "studentAttendance.read",
          context,
          "View student attendance",
          "Student records",
          "/student-attendance/view",
          "calendar-days",
        ),
      ]),
    },
    {
      label: "Teaching",
      actions: compact([
        action(
          user,
          "curriculum.read",
          context,
          "Curriculum",
          "Curriculum",
          "/syllabus",
          "book-open",
        ),
        action(
          user,
          "exams.read",
          context,
          "Exams",
          "Exams",
          "/exams",
          "clipboard-list",
        ),
        {
          label: "Library",
          mobileLabel: "Library",
          href: `/projects/${context.projectId}/centers/${context.centerId}/semesters/${context.semesterId}/dashboard/library`,
          icon: "library",
        } satisfies DashboardAction,
      ]),
    },
    {
      label: "Staff",
      actions: compact([
        action(
          user,
          "staffAttendance.write",
          context,
          "Mark staff attendance",
          "Mark staff",
          "/attendance/mark",
          "user-check",
        ),
        action(
          user,
          "staffAttendance.read",
          context,
          "View staff attendance",
          "Staff records",
          "/attendance/view",
          "calendar-days",
        ),
        user?.role === "ADMIN"
          ? action(
              user,
              "staffAttendance.read",
              context,
              "Remuneration",
              "Pay",
              "/attendance/remuneration",
              "wallet-cards",
            )
          : null,
        user?.role === "ADMIN"
          ? {
              label: "Expenses",
              mobileLabel: "Expenses",
              href: `/projects/${context.projectId}/centers/${context.centerId}/semesters/${context.semesterId}/dashboard/expenses`,
              icon: "wallet-cards",
            } satisfies DashboardAction
          : null,
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
    capabilities: {
      markStudentAttendance: can(user, "studentAttendance.write", context),
      markStaffAttendance: can(user, "staffAttendance.write", context),
      manageLevels: user?.role === "ADMIN",
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
