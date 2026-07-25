import type {
  AttendanceRecord,
  RemunerationPeriod,
  RemunerationUser,
} from "@/types/api";

export type RemunerationRow = {
  userId: string;
  userName: string;
  present: number;
  absent: number;
  notAvailable: number;
  dailyRate: number | null;
  total: number | null;
  byMonth: Record<string, { present: number; amount: number | null }>;
};

export type MonthlyRemunerationRow = {
  projectId: string;
  centerId: string;
  semesterId: string;
  month: string;
  userId: string;
  userName: string;
  presentDays: number;
  absentDays: number;
  notAvailableDays: number;
  dailyRate: number | null;
  calculatedAmount: number | null;
};

export type MonthlyRemunerationSummary = {
  month: string;
  label: string;
  startDate: string;
  endDate: string;
  presentDays: number;
  missingRateUserIds: string[];
  calculatedAmount: number | null;
  isComplete: boolean;
  status: "READY" | "NEEDS_RATE" | "NO_PAYABLE_ATTENDANCE";
};

const APP_TIME_ZONE = "Asia/Kolkata";
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

const dateOnlyParts = (value: string) => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= lastDay ? { year, month, day } : null;
};

// Semester dates are calendar values: preserve their stored YYYY-MM-DD portion.
const semesterDateOnly = (value: string) => {
  if (value.length !== 10 && !ISO_DATE_TIME_PATTERN.test(value)) return null;
  const dateOnly = value.slice(0, 10);
  if (!dateOnlyParts(dateOnly)) return null;
  if (value.length !== 10 && !Number.isFinite(new Date(value).getTime())) {
    return null;
  }
  return dateOnly;
};

// Instants are interpreted in the application's operating calendar.
export const indiaBusinessDate = (value: Date | string) => {
  if (typeof value === "string" && value.length === 10) {
    return semesterDateOnly(value);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const toPaise = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100);
const fromPaise = (amount: number) => amount / 100;
const normalizeRate = (rate: number | null | undefined) =>
  typeof rate === "number" && Number.isFinite(rate) && rate >= 0
    ? fromPaise(toPaise(rate))
    : null;

const amountForDate = (payee: RemunerationUser | undefined, date: string) => {
  if (payee?.remunerationPeriods) {
    const period = payee.remunerationPeriods.find(
      (item) =>
        item.effectiveFrom <= date &&
        (item.effectiveTo === null || date <= item.effectiveTo),
    );
    return normalizeRate(period?.amountPerDay);
  }
  return normalizeRate(payee?.dailyRate);
};

const previousDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

export const previewRemunerationSchedule = (
  periods: RemunerationPeriod[],
  amountPerDay: number,
  effectiveFrom: string,
) => {
  const sorted = periods
    .map((period) => ({ ...period }))
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const same = sorted.find((period) => period.effectiveFrom === effectiveFrom);
  if (same) {
    same.amountPerDay = amountPerDay;
    return sorted;
  }
  const earlier = sorted.filter(
    (period) => period.effectiveFrom < effectiveFrom,
  );
  const previous = earlier[earlier.length - 1];
  const next = sorted.find((period) => period.effectiveFrom > effectiveFrom);
  if (previous) previous.effectiveTo = previousDate(effectiveFrom);
  sorted.push({
    id: `preview-${effectiveFrom}`,
    amountPerDay,
    effectiveFrom,
    effectiveTo: next ? previousDate(next.effectiveFrom) : null,
  });
  return sorted.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
};

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export const validateRemunerationRate = (
  value: string,
  savedRate: number | null,
) => {
  const rate = value.trim();
  if (!rate) {
    return savedRate === null
      ? null
      : "Enter an amount or restore the saved value.";
  }
  if (rate.startsWith("-")) return "Daily remuneration must be zero or more.";
  if (!/^(?:\d+|\d*\.\d+)$/.test(rate)) return "Enter a valid number.";
  if ((rate.split(".")[1]?.length ?? 0) > 2) {
    return "Use no more than 2 decimal places.";
  }
  return Number.isFinite(Number(rate)) ? null : "Enter a valid number.";
};

export const enumerateSemesterMonths = (startDate: string, endDate: string) => {
  const startValue = semesterDateOnly(startDate);
  const endValue = semesterDateOnly(endDate);
  if (!startValue || !endValue || startValue > endValue) return [];
  const start = dateOnlyParts(startValue)!;
  const end = dateOnlyParts(endValue)!;
  let year = start.year;
  let month = start.month;
  const months: Array<{ value: string; label: string }> = [];
  while (year < end.year || (year === end.year && month <= end.month)) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    months.push({
      value,
      label: new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    });
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
  }
  return months;
};

export const selectDefaultSemesterMonth = (
  startDate: string,
  endDate: string,
  today: Date | string = new Date(),
) => {
  const months = enumerateSemesterMonths(startDate, endDate);
  if (!months.length) return "";

  const start = semesterDateOnly(startDate)!;
  const end = semesterDateOnly(endDate)!;
  const current = indiaBusinessDate(today);
  return current && current >= start && current <= end
    ? current.slice(0, 7)
    : (months.at(-1)?.value ?? "");
};

export const getMonthRange = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(
      new Date(Date.UTC(year, month, 0)).getUTCDate(),
    ).padStart(2, "0")}`,
  };
};

export const clampRangeToSemester = (
  range: { startDate: string; endDate: string },
  semester?: { startDate?: string; endDate?: string },
) => {
  if (!semester?.startDate || !semester.endDate) return range;
  const semesterStart = semesterDateOnly(semester.startDate);
  const semesterEnd = semesterDateOnly(semester.endDate);
  if (!semesterStart || !semesterEnd) return range;
  return {
    startDate:
      range.startDate > semesterStart ? range.startDate : semesterStart,
    endDate: range.endDate < semesterEnd ? range.endDate : semesterEnd,
  };
};

export const buildRemunerationRows = (
  attendance: AttendanceRecord[],
  payees: RemunerationUser[],
) => {
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const rows = new Map<string, RemunerationRow>();
  const monthlyRows = new Map<string, MonthlyRemunerationRow>();
  const uniqueAttendance = new Map<string, AttendanceRecord>();

  for (const payee of payees) {
    const dailyRate = normalizeRate(payee.dailyRate);
    rows.set(payee.id, {
      userId: payee.id,
      userName: payee.name || payee.firstName || "Unknown",
      present: 0,
      absent: 0,
      notAvailable: 0,
      dailyRate,
      total: 0,
      byMonth: {},
    });
  }

  // Mirrors UserAttendance's unique scope; a repeated API snapshot is not a
  // second payable day, and the later record represents the current upsert.
  for (const record of attendance) {
    uniqueAttendance.set(
      [
        record.userId,
        record.date,
        record.projectId,
        record.centerId,
        record.semesterId,
      ].join("\0"),
      record,
    );
  }

  for (const record of uniqueAttendance.values()) {
    const subRole = record.roleAssignment?.subRole;
    if (subRole !== "EDUCATOR" && subRole !== "CENTER_MANAGER") continue;
    const userId = record.userId;
    if (!userId) continue;
    const payee = payeeById.get(userId);
    const dailyRate = normalizeRate(payee?.dailyRate);

    if (!rows.has(userId)) {
      rows.set(userId, {
        userId,
        userName:
          record.userName || record.user?.name || payee?.name || "Unknown",
        present: 0,
        absent: 0,
        notAvailable: 0,
        dailyRate,
        total: 0,
        byMonth: {},
      });
    }
    const row = rows.get(userId)!;
    const month = record.date.slice(0, 7);
    const monthlyKey = [
      record.projectId,
      record.centerId,
      record.semesterId,
      userId,
      month,
    ].join("\0");
    row.byMonth[month] ??= {
      present: 0,
      amount: 0,
    };
    if (!monthlyRows.has(monthlyKey)) {
      monthlyRows.set(monthlyKey, {
        projectId: record.projectId,
        centerId: record.centerId,
        semesterId: record.semesterId,
        month,
        userId,
        userName: row.userName,
        presentDays: 0,
        absentDays: 0,
        notAvailableDays: 0,
        dailyRate,
        calculatedAmount: 0,
      });
    }
    const monthlyRow = monthlyRows.get(monthlyKey)!;
    if (record.status === "PRESENT") {
      const amountPerDay = amountForDate(payee, record.date.slice(0, 10));
      row.present += 1;
      row.byMonth[month].present += 1;
      monthlyRow.presentDays += 1;
      if (amountPerDay === null) {
        row.dailyRate = null;
        row.total = null;
        row.byMonth[month].amount = null;
        monthlyRow.dailyRate = null;
        monthlyRow.calculatedAmount = null;
      } else {
        if (row.total !== null) row.total = fromPaise(toPaise(row.total) + toPaise(amountPerDay));
        if (row.byMonth[month].amount !== null) {
          row.byMonth[month].amount = fromPaise(
            toPaise(row.byMonth[month].amount) + toPaise(amountPerDay),
          );
        }
        if (monthlyRow.calculatedAmount !== null) {
          monthlyRow.calculatedAmount = fromPaise(
            toPaise(monthlyRow.calculatedAmount) + toPaise(amountPerDay),
          );
        }
      }
    } else if (record.status === "ABSENT") {
      row.absent += 1;
      monthlyRow.absentDays += 1;
    } else if (record.status === "NOT_AVAILABLE") {
      row.notAvailable += 1;
      monthlyRow.notAvailableDays += 1;
    }
  }

  const orderedRows = [...rows.values()].sort((a, b) =>
    a.userName.localeCompare(b.userName),
  );
  const orderedMonthlyRows = [...monthlyRows.values()].sort(
    (a, b) =>
      a.userName.localeCompare(b.userName) ||
      a.month.localeCompare(b.month) ||
      a.projectId.localeCompare(b.projectId) ||
      a.centerId.localeCompare(b.centerId) ||
      a.semesterId.localeCompare(b.semesterId),
  );
  const missingRateUserIds = orderedRows
    .filter((row) => row.present > 0 && row.total === null)
    .map((row) => row.userId)
    .sort();
  return {
    rows: orderedRows,
    monthlyRows: orderedMonthlyRows,
    missingRateUserIds,
    total:
      missingRateUserIds.length > 0
        ? null
        : fromPaise(
            orderedRows.reduce(
              (sum, row) => sum + toPaise(row.total ?? 0),
              0,
            ),
          ),
  };
};

export const buildMonthlyRemunerationSummary = (
  rows: MonthlyRemunerationRow[],
  semesterStartDate: string,
  semesterEndDate: string,
) => {
  const months: MonthlyRemunerationSummary[] = enumerateSemesterMonths(
    semesterStartDate,
    semesterEndDate,
  ).map(({ value, label }) => {
    const monthRows = rows.filter((row) => row.month === value);
    const validMonthRows = monthRows;
    const missingRateUserIds = [
      ...new Set(
        validMonthRows
          .filter((row) => row.presentDays > 0 && row.calculatedAmount === null)
          .map((row) => row.userId),
      ),
    ].sort();
    const isComplete = missingRateUserIds.length === 0;
    const presentDays = validMonthRows.reduce(
      (sum, row) => sum + row.presentDays,
      0,
    );
    return {
      month: value,
      label,
      ...clampRangeToSemester(
        getMonthRange(value),
        { startDate: semesterStartDate, endDate: semesterEndDate },
      ),
      presentDays,
      missingRateUserIds,
      calculatedAmount: isComplete
        ? fromPaise(
            validMonthRows.reduce(
              (sum, row) => sum + toPaise(row.calculatedAmount ?? 0),
              0,
            ),
          )
        : null,
      isComplete,
      status:
        presentDays === 0
          ? ("NO_PAYABLE_ATTENDANCE" as const)
          : isComplete
            ? ("READY" as const)
            : ("NEEDS_RATE" as const),
    };
  });
  const missingRateUserIds = [
    ...new Set(months.flatMap((month) => month.missingRateUserIds)),
  ].sort();
  const isComplete = missingRateUserIds.length === 0;
  return {
    months,
    presentDays: months.reduce((sum, month) => sum + month.presentDays, 0),
    missingRateUserIds,
    calculatedAmount: isComplete
      ? fromPaise(
          months.reduce(
            (sum, month) => sum + toPaise(month.calculatedAmount ?? 0),
            0,
          ),
        )
      : null,
    isComplete,
  };
};
