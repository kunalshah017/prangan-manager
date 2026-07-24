import type { Semester } from "@/types/api";

const semesterStatusOrder: Record<Semester["status"], number> = {
  DRAFT: 0,
  ACTIVE: 1,
  ARCHIVED: 2,
};

export const projectCardDestination = (projectId: string) =>
  `/projects/${projectId}/dashboard`;

export const centerCardDestination = (projectId: string, centerId: string) =>
  `/projects/${projectId}/centers/${centerId}/dashboard`;

export const semesterCardDestination = (
  projectId: string,
  centerId: string,
  semester: Pick<Semester, "id" | "status">,
) =>
  `/projects/${projectId}/centers/${centerId}/semesters/${semester.id}/${
    semester.status === "DRAFT" ? "setup" : "dashboard"
  }`;

export const orderWorkspaceSemesters = (
  semesters: readonly Semester[],
): Semester[] =>
  [...semesters].sort(
    (first, second) =>
      semesterStatusOrder[first.status] - semesterStatusOrder[second.status] ||
      Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
  );
