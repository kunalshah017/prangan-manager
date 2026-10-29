import { describe, expect, it } from "vitest";

import { buildMonthlyActivity } from "@/lib/user-activity";
import type { AttendanceRecord, User } from "@/types/api";

const record = (
  date: string,
  status: AttendanceRecord["status"],
  semesterId: string,
  subRole: "EDUCATOR" | "TECH" = "EDUCATOR",
): AttendanceRecord =>
  ({
    id: `${semesterId}-${date}`,
    userId: "user-1",
    userName: "Asha",
    date,
    status,
    projectId: "project-1",
    centerId: `centre-${semesterId}`,
    centerName: semesterId === "lavender-2026" ? "Lavender" : "Tulip",
    semesterId,
    roleAssignment: { subRole },
  }) as unknown as AttendanceRecord;

const period = (semesterId: string, amountPerDay: string) => ({
  id: `${semesterId}-rate`,
  semesterId,
  amountPerDay,
  effectiveFrom: "2026-07-01T00:00:00.000Z",
  effectiveTo: null,
});

const user = (periods: NonNullable<User["remunerationPeriods"]>) => ({
  id: "user-1",
  name: "Asha",
  firstName: "Asha",
  remunerationPeriods: periods,
});

describe("buildMonthlyActivity", () => {
  it("prices each semester with its own rate when centres share dates", () => {
    const months = buildMonthlyActivity(
      user([period("lavender-2026", "650.00"), period("tulip-2026", "500.00")]),
      [
        record("2026-10-03", "PRESENT", "lavender-2026"),
        record("2026-10-04", "PRESENT", "tulip-2026"),
        record("2026-10-10", "ABSENT", "lavender-2026"),
      ],
    );

    expect(months).toHaveLength(1);
    expect(months[0].label).toBe("October 2026");
    expect(months[0].amount).toBe(1150);
    expect(months[0].days.map((day) => [day.date, day.status])).toEqual([
      ["2026-10-03", "PRESENT"],
      ["2026-10-04", "PRESENT"],
      ["2026-10-10", "ABSENT"],
    ]);
  });

  it("reports a missing rate instead of a wrong amount", () => {
    const [month] = buildMonthlyActivity(user([]), [record("2026-09-06", "PRESENT", "lavender-2026")]);
    expect(month.amount).toBeNull();
  });

  it("leaves pay out for roles that are not paid per day, newest month first", () => {
    const months = buildMonthlyActivity(user([period("lavender-2026", "650")]), [
      record("2026-08-02", "PRESENT", "lavender-2026", "TECH"),
      record("2026-09-06", "PRESENT", "lavender-2026"),
    ]);
    expect(months.map((month) => month.month)).toEqual(["2026-09", "2026-08"]);
    expect(months[0].amount).toBe(650);
    expect(months[1].amount).toBeUndefined();
  });
});
