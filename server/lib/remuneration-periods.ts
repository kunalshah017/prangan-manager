import { isValidDateFormat } from "../utils/dateHelpers.js";
import { hasAtMostTwoDecimals } from "../utils/money.js";

export type RemunerationPeriod = {
  effectiveFrom: string;
  effectiveTo: string | null;
  amountPerDay: number;
};

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
      !hasAtMostTwoDecimals(period.amountPerDay)
    ) {
      errors.push(
        "Daily remuneration must be zero or more with at most two decimal places.",
      );
    }
    if (
      !isValidDateFormat(period.effectiveFrom) ||
      period.effectiveFrom < semesterStart ||
      period.effectiveFrom > semesterEnd
    ) {
      errors.push("Effective from must fall within the semester.");
    }
    if (
      period.effectiveTo !== null &&
      (!isValidDateFormat(period.effectiveTo) ||
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
