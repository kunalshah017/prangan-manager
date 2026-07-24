export type RemunerationPeriod = {
  effectiveFrom: string;
  effectiveTo: string | null;
  amountPerDay: number;
};

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

const isDateOnly = (value: string) =>
  dateOnly.test(value) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

export const findRemunerationPeriod = <T extends RemunerationPeriod>(
  periods: T[],
  attendanceDate: string,
): T | null =>
  periods.find(
    (period) =>
      period.effectiveFrom <= attendanceDate &&
      (period.effectiveTo === null || attendanceDate <= period.effectiveTo),
  ) ?? null;

export const validateRemunerationPeriods = (
  periods: RemunerationPeriod[],
  semesterStart: string,
  semesterEnd: string,
) => {
  const errors: string[] = [];
  const sorted = [...periods].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );

  for (const [index, period] of sorted.entries()) {
    if (
      !Number.isFinite(period.amountPerDay) ||
      period.amountPerDay < 0 ||
      Math.round(period.amountPerDay * 100) !== period.amountPerDay * 100
    ) {
      errors.push(
        "Daily remuneration must be zero or more with at most two decimal places.",
      );
    }
    if (
      !isDateOnly(period.effectiveFrom) ||
      period.effectiveFrom < semesterStart ||
      period.effectiveFrom > semesterEnd
    ) {
      errors.push("Effective from must fall within the semester.");
    }
    if (
      period.effectiveTo !== null &&
      (!isDateOnly(period.effectiveTo) ||
        period.effectiveTo < semesterStart ||
        period.effectiveTo > semesterEnd)
    ) {
      errors.push("Effective to must fall within the semester.");
    }
    if (
      period.effectiveTo !== null &&
      period.effectiveTo < period.effectiveFrom
    ) {
      errors.push("Effective to cannot be before effective from.");
    }
    const previous = sorted[index - 1];
    if (
      previous &&
      (previous.effectiveTo === null ||
        previous.effectiveTo >= period.effectiveFrom)
    ) {
      errors.push("Remuneration periods cannot overlap.");
    }
  }

  return [...new Set(errors)];
};
