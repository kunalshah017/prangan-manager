import { buildRemunerationRows } from "@/lib/remuneration";
import type { AttendanceRecord, RemunerationUser, User } from "@/types/api";

export type ActivityDay = {
  date: string;
  status: AttendanceRecord["status"];
  centreName: string;
};

export type ActivityMonth = {
  month: string;
  label: string;
  days: ActivityDay[];
  // null when a worked day has no rate set; undefined when nothing is payable.
  amount: number | null | undefined;
};

const dateOnly = (value: string) => value.slice(0, 10);

// One row per month: the days someone worked and what that month pays. Each
// semester is priced with its own rates, because centres run semesters over
// the same dates and a date alone cannot pick the right rate.
export const buildMonthlyActivity = (
  user: Pick<User, "id" | "name" | "firstName" | "remunerationPeriods">,
  attendance: AttendanceRecord[],
): ActivityMonth[] => {
  const months = new Map<string, ActivityMonth>();
  const bySemester = new Map<string, AttendanceRecord[]>();

  for (const record of attendance) {
    if (record.userId !== user.id) continue;
    const month = record.date.slice(0, 7);
    const entry = months.get(month) ?? {
      month,
      label: new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      days: [],
      amount: undefined,
    };
    entry.days.push({ date: dateOnly(record.date), status: record.status, centreName: record.centerName });
    months.set(month, entry);
    bySemester.set(record.semesterId, [...(bySemester.get(record.semesterId) ?? []), record]);
  }

  for (const [semesterId, records] of bySemester) {
    const payee: RemunerationUser = {
      id: user.id,
      name: user.name,
      firstName: user.firstName ?? user.name,
      dailyRate: null,
      remunerationPeriods: (user.remunerationPeriods ?? [])
        .filter((period) => period.semesterId === semesterId)
        .map((period) => ({
          id: period.id,
          amountPerDay: Number(period.amountPerDay),
          effectiveFrom: dateOnly(period.effectiveFrom),
          effectiveTo: period.effectiveTo ? dateOnly(period.effectiveTo) : null,
        })),
    };
    for (const row of buildRemunerationRows(records, [payee]).monthlyRows) {
      if (row.presentDays === 0) continue;
      const entry = months.get(row.month);
      if (!entry) continue;
      if (entry.amount === null || row.calculatedAmount === null) {
        entry.amount = null;
      } else {
        entry.amount = Math.round(((entry.amount ?? 0) + row.calculatedAmount) * 100) / 100;
      }
    }
  }

  return [...months.values()]
    .map((entry) => ({ ...entry, days: entry.days.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.month.localeCompare(a.month));
};
