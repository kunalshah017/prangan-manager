import { validateRemunerationRate } from "@/lib/remuneration";
import type { RoleAssignment, Semester, User } from "@/types/api";

// A person has one daily rate per semester, whatever roles they hold there. It
// is set on their first paid role in that semester and can change from a date:
// days before it keep the earlier rate.
export type RatePeriod = NonNullable<User["remunerationPeriods"]>[number];
export type RateDraft = { amount: string; from: string };
type SemesterDates = Pick<Semester, "id" | "startDate" | "endDate">;

export const isPaidRole = (subRole?: string) => subRole === "EDUCATOR" || subRole === "CENTER_MANAGER";

const day = (value: string) => value.slice(0, 10);

// The assignment that shows a semester's rate: the first paid role there.
export const rateHolderIndex = (assignments: RoleAssignment[], semesterId: string) =>
  assignments.findIndex((assignment) => isPaidRole(assignment.subRole) && assignment.semesterId === semesterId);

export const semesterPeriods = (periods: RatePeriod[], semesterId: string) =>
  periods
    .filter((period) => period.semesterId === semesterId)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

// The rate in effect on a day, else the latest one.
export const currentRate = (periods: RatePeriod[], semesterId: string, today: string) => {
  const history = semesterPeriods(periods, semesterId);
  return (
    history.find((period) => day(period.effectiveFrom) <= today && (!period.effectiveTo || today <= day(period.effectiveTo))) ??
    history.at(-1) ??
    null
  );
};

// What the rate field shows before anyone edits it: the saved rate, and for a
// change, today (inside the semester) as the start date.
export const initialDraft = (
  periods: RatePeriod[],
  semester: SemesterDates | undefined,
  today: string,
): RateDraft => {
  const saved = semester ? currentRate(periods, semester.id, today) : null;
  const start = semester ? day(semester.startDate) : today;
  const end = semester ? day(semester.endDate) : today;
  return {
    amount: saved ? String(Number(saved.amountPerDay)) : "",
    from: saved ? (today < start ? start : today > end ? end : today) : start,
  };
};

type RateCheck = {
  assignments: RoleAssignment[];
  periods: RatePeriod[];
  drafts: Record<string, RateDraft>;
  semesters: SemesterDates[];
  today: string;
};

const paidSemesterIds = (assignments: RoleAssignment[]) => [
  ...new Set(
    assignments
      .filter((assignment) => isPaidRole(assignment.subRole) && assignment.semesterId)
      .map((assignment) => assignment.semesterId!),
  ),
];

// Problems to fix before saving, worded like the other assignment errors.
export const rateErrors = ({ assignments, periods, drafts, semesters, today }: RateCheck) =>
  paidSemesterIds(assignments).flatMap((semesterId) => {
    const semester = semesters.find((candidate) => candidate.id === semesterId);
    const saved = currentRate(periods, semesterId, today);
    const draft = drafts[semesterId] ?? initialDraft(periods, semester, today);
    const label = `Assignment ${rateHolderIndex(assignments, semesterId) + 1}`;
    if (!draft.amount.trim()) {
      return [saved ? `${label}: enter a daily rate or keep the saved one.` : `${label}: enter a daily rate.`];
    }
    const invalid = validateRemunerationRate(draft.amount, saved ? Number(saved.amountPerDay) : null);
    if (invalid) return [`${label}: ${invalid}`];
    const changed = saved && Number(draft.amount) !== Number(saved.amountPerDay);
    if (changed && semester && (draft.from < day(semester.startDate) || draft.from > day(semester.endDate))) {
      return [`${label}: the new rate has to start within the semester.`];
    }
    return [];
  });

// The rates to save: new ones from the semester's first day, changed ones from
// the chosen date.
export const rateChanges = ({ assignments, periods, drafts, semesters, today }: RateCheck) =>
  paidSemesterIds(assignments).flatMap((semesterId) => {
    const draft = drafts[semesterId];
    const holder = assignments[rateHolderIndex(assignments, semesterId)];
    const semester = semesters.find((candidate) => candidate.id === semesterId);
    if (!draft || !holder?.projectId || !holder.centerId || !semester) return [];
    const saved = currentRate(periods, semesterId, today);
    const amountPerDay = Number(draft.amount);
    if (saved && Number(saved.amountPerDay) === amountPerDay) return [];
    return [
      {
        projectId: holder.projectId,
        centerId: holder.centerId,
        semesterId,
        amountPerDay,
        effectiveFrom: saved ? draft.from : day(semester.startDate),
      },
    ];
  });
