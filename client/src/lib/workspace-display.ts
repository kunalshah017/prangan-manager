import type { Center, Semester } from "@/types/api";

export const projectStatus = (status?: "ACTIVE" | "INACTIVE") =>
  (status ?? "ACTIVE") === "ACTIVE"
    ? { tone: "running" as const, label: "Active" }
    : { tone: "inactive" as const, label: "Inactive" };

// Copy before sorting so the cached query data keeps its order.
export const sortCentresByRecentUpdate = (centres: Center[] | undefined) =>
  [...(centres || [])].sort(
    (first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
  );

// Matches the server rule: a finished semester takes no new roles.
export const isSemesterFinished = (
  semester: Pick<Semester, "status" | "endDate">,
  today: string = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
) => semester.status === "ARCHIVED" || semester.endDate.slice(0, 10) < today;

// A semester's label comes from today's date, so the one being taught now
// stands out; drafts and archived semesters keep their stored status.
export const semesterTiming = (
  semester: Pick<Semester, "status" | "startDate" | "endDate">,
  today: Date = new Date(),
) => {
  if (semester.status === "DRAFT") return { tone: "draft" as const, label: "Draft" };
  if (semester.status === "ARCHIVED") return { tone: "ended" as const, label: "Archived" };
  const day = today.toISOString().slice(0, 10);
  if (day < semester.startDate.slice(0, 10)) return { tone: "inactive" as const, label: "Upcoming" };
  if (day > semester.endDate.slice(0, 10)) return { tone: "ended" as const, label: "Ended" };
  return { tone: "running" as const, label: "Active" };
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Where today sits in a running semester, counted in calendar days.
export function semesterProgress(
  semester: Pick<Semester, "startDate" | "endDate">,
  today: Date = new Date(),
) {
  const start = Date.parse(semester.startDate.slice(0, 10));
  const end = Date.parse(semester.endDate.slice(0, 10));
  const day = Date.parse(today.toISOString().slice(0, 10));
  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS) + 1);
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, Math.round((day - start) / DAY_MS) + 1),
  );
  return {
    daysLeft: totalDays - elapsedDays,
    percentage: Math.round((elapsedDays / totalDays) * 100),
  };
}
