import type { Semester, SemesterSetupSummary } from "@/types/api";

export type DraftSetupSummaryView = SemesterSetupSummary & {
  progressAvailable: boolean;
};

const safeCount = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export const normalizeSetupProgress = (
  resolvedValue: number,
  totalValue: number,
  emptyIsComplete = true,
) => {
  const total = safeCount(totalValue);
  const resolved = Math.min(safeCount(resolvedValue), total);
  const percentage =
    total === 0
      ? emptyIsComplete
        ? 100
        : 0
      : Math.round((resolved / total) * 100);

  return { resolved, total, percentage };
};

const emptyProgress = {
  students: { resolved: 0, total: 0 },
  staff: { resolved: 0, total: 0 },
  rates: { resolved: 0, total: 0 },
};

export const mergeDraftSetupSummaries = (
  semesters: readonly Semester[],
  summaries: readonly SemesterSetupSummary[],
): DraftSetupSummaryView[] => {
  const summariesBySemesterId = new Map<string, SemesterSetupSummary>();
  for (const summary of summaries) {
    if (!summariesBySemesterId.has(summary.semester.id)) {
      summariesBySemesterId.set(summary.semester.id, summary);
    }
  }

  return semesters
    .filter((semester) => semester.status === "DRAFT")
    .map((semester) => {
      const summary = summariesBySemesterId.get(semester.id);
      if (summary) {
        return {
          ...summary,
          semester: {
            id: semester.id,
            name: semester.name,
            status: semester.status,
            startDate: semester.startDate,
            endDate: semester.endDate,
          },
          progressAvailable: true,
        };
      }

      return {
        semester: {
          id: semester.id,
          name: semester.name,
          status: semester.status,
          startDate: semester.startDate,
          endDate: semester.endDate,
        },
        sourceSemester: null,
        updatedAt: semester.updatedAt,
        progress: emptyProgress,
        progressAvailable: false,
      };
    });
};
