import { describe, expect, it } from "vitest";

import {
  buildMonthlyRemunerationSummary,
  buildRemunerationRows,
  enumerateSemesterMonths,
  formatINR,
  indiaBusinessDate,
  previewRemunerationSchedule,
  selectDefaultSemesterMonth,
  validateRemunerationRate,
} from "@/lib/remuneration";
import type { AttendanceRecord, RemunerationUser } from "@/types/api";

const attendanceRecord = (
  overrides: Partial<AttendanceRecord>,
): AttendanceRecord => ({
  id: "attendance-1",
  userId: "user-1",
  userName: "Asha",
  userEmail: "asha@example.com",
  date: "2026-07-05",
  status: "PRESENT",
  roleAssignmentId: "assignment-1",
  projectId: "project-1",
  projectName: "Project One",
  centerId: "center-1",
  centerName: "Center One",
  semesterId: "semester-1",
  semesterName: "Semester One",
  createdAt: "2026-07-05T12:00:00Z",
  updatedAt: "2026-07-05T12:00:00Z",
  roleAssignment: {
    id: "assignment-1",
    subRole: "EDUCATOR",
  },
  ...overrides,
});

const payee = (
  id: string,
  name: string,
  dailyRate: number | null,
): RemunerationUser => ({
  id,
  name,
  firstName: name,
  dailyRate,
});

const attendance: AttendanceRecord[] = [
  attendanceRecord({ id: "attendance-1" }),
  attendanceRecord({
    id: "attendance-2",
    date: "2026-08-02",
  }),
  attendanceRecord({
    id: "attendance-3",
    userId: "user-2",
    userName: "Dev",
    userEmail: "dev@example.com",
    roleAssignmentId: "assignment-2",
    roleAssignment: {
      id: "assignment-2",
      subRole: "CENTER_MANAGER",
    },
  }),
];

describe("semester remuneration calculations", () => {
  it("previews a new exact-date remuneration period without rewriting earlier dates", () => {
    expect(
      previewRemunerationSchedule(
        [
          {
            id: "period-1",
            amountPerDay: 500,
            effectiveFrom: "2026-07-01",
            effectiveTo: null,
          },
        ],
        650,
        "2026-07-15",
      ),
    ).toEqual([
      expect.objectContaining({ amountPerDay: 500, effectiveTo: "2026-07-14" }),
      expect.objectContaining({
        amountPerDay: 650,
        effectiveFrom: "2026-07-15",
        effectiveTo: null,
      }),
    ]);
  });

  it("uses the daily remuneration effective on each attendance date", () => {
    const person = payee("user-1", "Asha", 650);
    person.remunerationPeriods = [
      {
        id: "period-1",
        amountPerDay: 500,
        effectiveFrom: "2026-07-01",
        effectiveTo: "2026-07-14",
      },
      {
        id: "period-2",
        amountPerDay: 650,
        effectiveFrom: "2026-07-15",
        effectiveTo: null,
      },
    ];
    const result = buildRemunerationRows(
      [
        attendanceRecord({ id: "before", date: "2026-07-14" }),
        attendanceRecord({ id: "after", date: "2026-07-15" }),
      ],
      [person],
    );

    expect(result.rows[0].total).toBe(1150);
    expect(result.missingRateUserIds).toEqual([]);
  });

  it("uses the configured semester rate including a valid zero rate", () => {
    const result = buildRemunerationRows(attendance, [
      payee("user-1", "Asha", 625),
      payee("user-2", "Dev", 0),
    ]);

    expect(result.missingRateUserIds).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        userId: "user-1",
        present: 2,
        dailyRate: 625,
        total: 1250,
      }),
      expect.objectContaining({
        userId: "user-2",
        present: 1,
        dailyRate: 0,
        total: 0,
      }),
    ]);
    expect(result.total).toBe(1250);
  });

  it("blocks totals instead of silently falling back when a rate is missing", () => {
    const result = buildRemunerationRows(attendance, [
      payee("user-1", "Asha", null),
      payee("user-2", "Dev", 500),
    ]);

    expect(result.missingRateUserIds).toEqual(["user-1"]);
    expect(result.total).toBeNull();
    expect(result.rows[0].total).toBeNull();
  });

  it("seeds every assigned payee even when they have no attendance", () => {
    const result = buildRemunerationRows(
      [attendanceRecord({ userId: "user-1", userName: "Asha" })],
      [
        payee("user-1", "Asha", 625),
        payee("user-2", "Dev", null),
      ],
    );

    expect(result.rows).toEqual([
      expect.objectContaining({
        userId: "user-1",
        present: 1,
        total: 625,
      }),
      expect.objectContaining({
        userId: "user-2",
        present: 0,
        absent: 0,
        notAvailable: 0,
        dailyRate: null,
        total: 0,
      }),
    ]);
    expect(result.missingRateUserIds).toEqual([]);
    expect(result.total).toBe(625);
  });

  it("keeps one row when a configured payee also has attendance", () => {
    const result = buildRemunerationRows(
      [
        attendanceRecord({ id: "attendance-1" }),
        attendanceRecord({ id: "attendance-2", date: "2026-07-06" }),
      ],
      [payee("user-1", "Asha", 100)],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ present: 2, total: 200 }),
    );
  });

  it("builds a month-by-month breakdown without changing the rate", () => {
    const result = buildRemunerationRows(attendance, [
      payee("user-1", "Asha", 625),
      payee("user-2", "Dev", 500),
    ]);

    expect(result.rows[0].byMonth).toEqual({
      "2026-07": { present: 1, amount: 625 },
      "2026-08": { present: 1, amount: 625 },
    });
  });

  it("formats semester months and Indian currency consistently", () => {
    expect(enumerateSemesterMonths("2026-07-01", "2026-09-30")).toEqual([
      { value: "2026-07", label: "Jul 2026" },
      { value: "2026-08", label: "Aug 2026" },
      { value: "2026-09", label: "Sep 2026" },
    ]);
    expect(formatINR(23375)).toContain("23,375");
  });

  it("selects the previous calendar month, clamped to the semester", () => {
    expect(
      selectDefaultSemesterMonth(
        "2026-07-12",
        "2026-09-08",
        new Date("2026-08-15T12:00:00Z"),
      ),
    ).toBe("2026-07");
    expect(
      selectDefaultSemesterMonth(
        "2026-07-12",
        "2026-09-08",
        new Date("2026-06-30T23:59:59Z"),
      ),
    ).toBe("2026-07");
    expect(
      selectDefaultSemesterMonth(
        "2026-07-12",
        "2026-09-08",
        new Date("2026-10-01T00:00:00Z"),
      ),
    ).toBe("2026-09");
  });

  it("handles partial boundaries and invalid semester dates consistently", () => {
    expect(
      selectDefaultSemesterMonth(
        "2026-07-31",
        "2026-08-01",
        new Date("2026-07-31T23:00:00Z"),
      ),
    ).toBe("2026-07");
    expect(
      selectDefaultSemesterMonth(
        "not-a-date",
        "2026-08-01",
        new Date("2026-07-31T00:00:00Z"),
      ),
    ).toBe("");
    expect(enumerateSemesterMonths("not-a-date", "2026-08-01")).toEqual([]);
    expect(
      enumerateSemesterMonths("2026-07-01Trash", "2026-08-01"),
    ).toEqual([]);
    expect(enumerateSemesterMonths("2026-08-02", "2026-08-01")).toEqual([]);
    expect(
      selectDefaultSemesterMonth(
        "2026-08-02",
        "2026-08-01",
        new Date("2026-08-01T00:00:00Z"),
      ),
    ).toBe("");
  });

  it("uses Asia/Kolkata calendar dates for instants at month boundaries", () => {
    expect(indiaBusinessDate("2026-07-31T20:00:00.000Z")).toBe("2026-08-01");
    expect(indiaBusinessDate("2026-07-31T18:29:59.999Z")).toBe("2026-07-31");
    expect(
      selectDefaultSemesterMonth(
        "2026-07-01",
        "2026-08-31",
        new Date("2026-07-31T20:00:00Z"),
      ),
    ).toBe("2026-07");
    expect(
      enumerateSemesterMonths(
        "2026-07-01T00:00:00.000Z",
        "2026-08-31T00:00:00.000Z",
      ),
    ).toEqual([
      { value: "2026-07", label: "Jul 2026" },
      { value: "2026-08", label: "Aug 2026" },
    ]);
  });

  it("builds complete month summaries and treats a zero rate as valid", () => {
    const result = buildRemunerationRows(attendance, [
      payee("user-1", "Asha", 625),
      payee("user-2", "Dev", 0),
    ]);

    const summary = buildMonthlyRemunerationSummary(
      result.monthlyRows,
      "2026-07-12",
      "2026-09-08",
    );

    expect(summary).toEqual({
      months: [
        {
          month: "2026-07",
          label: "Jul 2026",
          startDate: "2026-07-12",
          endDate: "2026-07-31",
          presentDays: 2,
          missingRateUserIds: [],
          calculatedAmount: 625,
          isComplete: true,
          status: "READY",
        },
        {
          month: "2026-08",
          label: "Aug 2026",
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          presentDays: 1,
          missingRateUserIds: [],
          calculatedAmount: 625,
          isComplete: true,
          status: "READY",
        },
        {
          month: "2026-09",
          label: "Sep 2026",
          startDate: "2026-09-01",
          endDate: "2026-09-08",
          presentDays: 0,
          missingRateUserIds: [],
          calculatedAmount: 0,
          isComplete: true,
          status: "NO_PAYABLE_ATTENDANCE",
        },
      ],
      presentDays: 3,
      missingRateUserIds: [],
      calculatedAmount: 1250,
      isComplete: true,
    });
  });

  it("makes only affected months and the semester total incomplete for missing rates", () => {
    const result = buildRemunerationRows(attendance, [
      payee("user-1", "Asha", 625),
      payee("user-2", "Dev", null),
    ]);

    expect(result.monthlyRows).toEqual([
      expect.objectContaining({
        month: "2026-07",
        userId: "user-1",
        presentDays: 1,
        calculatedAmount: 625,
      }),
      expect.objectContaining({
        month: "2026-08",
        userId: "user-1",
        presentDays: 1,
        calculatedAmount: 625,
      }),
      expect.objectContaining({
        month: "2026-07",
        userId: "user-2",
        presentDays: 1,
        dailyRate: null,
        calculatedAmount: null,
      }),
    ]);

    const summary = buildMonthlyRemunerationSummary(
      result.monthlyRows,
      "2026-07-01",
      "2026-08-31",
    );

    expect(summary.months[0]).toEqual(
      expect.objectContaining({
        month: "2026-07",
        missingRateUserIds: ["user-2"],
        calculatedAmount: null,
        isComplete: false,
      }),
    );
    expect(summary.months[1]).toEqual(
      expect.objectContaining({
        month: "2026-08",
        missingRateUserIds: [],
        calculatedAmount: 625,
        isComplete: true,
      }),
    );
    expect(summary).toEqual(
      expect.objectContaining({
        missingRateUserIds: ["user-2"],
        calculatedAmount: null,
        isComplete: false,
      }),
    );
  });

  it("does not block a month for an unconfigured payee without present days", () => {
    const result = buildRemunerationRows(
      [
        attendanceRecord({
          userId: "user-1",
          userName: "Asha",
          status: "ABSENT",
        }),
      ],
      [payee("user-1", "Asha", null)],
    );
    const summary = buildMonthlyRemunerationSummary(
      result.monthlyRows,
      "2026-07-01",
      "2026-07-31",
    );

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        present: 0,
        dailyRate: null,
        total: 0,
      }),
    );
    expect(result.monthlyRows[0].calculatedAmount).toBe(0);
    expect(summary.months[0]).toEqual(
      expect.objectContaining({
        presentDays: 0,
        missingRateUserIds: [],
        calculatedAmount: 0,
        isComplete: true,
        status: "NO_PAYABLE_ATTENDANCE",
      }),
    );
    expect(summary.calculatedAmount).toBe(0);
  });

  it("does not mutate attendance, payees, or computed monthly rows", () => {
    const sourceAttendance = structuredClone(attendance);
    const payees = [
      payee("user-1", "Asha", 625),
      payee("user-2", "Dev", 0),
    ];
    const sourcePayees = structuredClone(payees);
    const result = buildRemunerationRows(attendance, payees);
    const sourceMonthlyRows = structuredClone(result.monthlyRows);

    buildMonthlyRemunerationSummary(
      result.monthlyRows,
      "2026-07-01",
      "2026-08-31",
    );

    expect(attendance).toEqual(sourceAttendance);
    expect(payees).toEqual(sourcePayees);
    expect(result.monthlyRows).toEqual(sourceMonthlyRows);
  });

  it("keeps monthly rows isolated by their complete scope identity", () => {
    const scopedAttendance = [
      attendanceRecord({ id: "attendance-1" }),
      attendanceRecord({
        id: "attendance-2",
        projectId: "project-2",
        projectName: "Project Two",
        centerId: "center-2",
        centerName: "Center Two",
        semesterId: "semester-2",
        semesterName: "Semester Two",
      }),
    ];

    const result = buildRemunerationRows(scopedAttendance, [
      payee("user-1", "Asha", 100),
    ]);

    expect(result.monthlyRows).toHaveLength(2);
    expect(result.monthlyRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          presentDays: 1,
        }),
        expect.objectContaining({
          projectId: "project-2",
          centerId: "center-2",
          semesterId: "semester-2",
          presentDays: 1,
        }),
      ]),
    );
  });

  it("deduplicates attendance using the database scope identity", () => {
    const duplicate = attendanceRecord({
      id: "newer-response-copy",
      status: "ABSENT",
      updatedAt: "2026-07-05T13:00:00Z",
    });
    const result = buildRemunerationRows(
      [attendanceRecord({ id: "older-response-copy" }), duplicate],
      [payee("user-1", "Asha", 100)],
    );

    expect(result.rows[0]).toEqual(
      expect.objectContaining({ present: 0, absent: 1, total: 0 }),
    );
    expect(result.monthlyRows[0]).toEqual(
      expect.objectContaining({
        presentDays: 0,
        absentDays: 1,
        calculatedAmount: 0,
      }),
    );
  });

  it("rejects negative and non-finite rates and rounds money through integer paise", () => {
    const fractionalAttendance = [
      attendanceRecord({ id: "attendance-1" }),
      attendanceRecord({
        id: "attendance-2",
        date: "2026-07-06",
      }),
      attendanceRecord({
        id: "attendance-3",
        date: "2026-07-07",
      }),
    ];

    const fractional = buildRemunerationRows(fractionalAttendance, [
      payee("user-1", "Asha", 10.005),
    ]);
    expect(fractional.rows[0]).toEqual(
      expect.objectContaining({
        dailyRate: 10.01,
        total: 30.03,
      }),
    );
    expect(fractional.monthlyRows[0].calculatedAmount).toBe(30.03);
    expect(
      buildMonthlyRemunerationSummary(
        fractional.monthlyRows,
        "2026-07-01",
        "2026-07-31",
      ).calculatedAmount,
    ).toBe(30.03);

    for (const invalidRate of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const invalid = buildRemunerationRows(
        [attendanceRecord({})],
        [payee("user-1", "Asha", invalidRate)],
      );
      expect(invalid.rows[0].dailyRate).toBeNull();
      expect(invalid.monthlyRows[0].calculatedAmount).toBeNull();
      expect(invalid.total).toBeNull();
    }
  });

  it("validates decimal rate drafts without accepting exponent or excess precision", () => {
    expect(validateRemunerationRate("", null)).toBeNull();
    expect(validateRemunerationRate("0", null)).toBeNull();
    expect(validateRemunerationRate("625.25", null)).toBeNull();
    expect(validateRemunerationRate(" 625.25 ", null)).toBeNull();
    expect(validateRemunerationRate("", 500)).toMatch(/restore/i);
    expect(validateRemunerationRate("-1", null)).toMatch(/zero or more/i);
    expect(validateRemunerationRate("1e2", null)).toMatch(/number/i);
    expect(validateRemunerationRate("10.005", null)).toMatch(/decimal/i);
    expect(validateRemunerationRate("Infinity", null)).toMatch(/number/i);
  });
});
