import { describe, expect, it } from "vitest";

import { buildStaffAttendancePdfModel } from "@/lib/staff-attendance-pdf";
import type { AttendanceRecord } from "@/types/api";

const record = (
  overrides: Partial<AttendanceRecord>,
): AttendanceRecord => ({
  id: "attendance-1",
  userId: "educator-1",
  userName: "Asha",
  userEmail: "asha@example.com",
  date: "2026-07-04",
  status: "PRESENT",
  roleAssignmentId: "assignment-1",
  projectId: "project-1",
  projectName: "Project One",
  centerId: "center-1",
  centerName: "Tulip",
  semesterId: "semester-1",
  semesterName: "Semester 2026-27",
  createdAt: "2026-07-04T12:00:00.000Z",
  updatedAt: "2026-07-04T12:00:00.000Z",
  roleAssignment: { id: "assignment-1", subRole: "EDUCATOR" },
  ...overrides,
});

describe("staff attendance PDF model", () => {
  it("builds a role-grouped date matrix and excludes unavailable and holiday records from attendance rates", () => {
    const model = buildStaffAttendancePdfModel({
      records: [
        record({ id: "a1", date: "2026-07-04", status: "PRESENT" }),
        record({ id: "a2", date: "2026-07-05", status: "ABSENT" }),
        record({
          id: "m1",
          userId: "manager-1",
          userName: "Dev",
          roleAssignmentId: "assignment-2",
          date: "2026-07-04",
          status: "NOT_AVAILABLE",
          roleAssignment: { id: "assignment-2", subRole: "CENTER_MANAGER" },
        }),
        record({
          id: "m2",
          userId: "manager-1",
          userName: "Dev",
          roleAssignmentId: "assignment-2",
          date: "2026-07-05",
          status: "HOLIDAY",
          roleAssignment: { id: "assignment-2", subRole: "CENTER_MANAGER" },
        }),
      ],
    });

    expect(model.dates).toEqual(["2026-07-04", "2026-07-05"]);
    expect(model.statusTotals).toEqual({
      PRESENT: 1,
      ABSENT: 1,
      NOT_AVAILABLE: 1,
      HOLIDAY: 1,
    });
    expect(model.attendanceRate).toBe("50.0");
    expect(model.roleGroups).toEqual([
      expect.objectContaining({
        role: "CENTER_MANAGER",
        attendanceRate: "0.0",
        staff: [
          expect.objectContaining({
            name: "Dev",
            statuses: ["NOT_AVAILABLE", "HOLIDAY"],
          }),
        ],
      }),
      expect.objectContaining({
        role: "EDUCATOR",
        attendanceRate: "50.0",
        staff: [
          expect.objectContaining({
            name: "Asha",
            statuses: ["PRESENT", "ABSENT"],
          }),
        ],
      }),
    ]);
  });

  it("returns a printable empty model without a divide-by-zero rate", () => {
    expect(buildStaffAttendancePdfModel({ records: [] })).toMatchObject({
      dates: [],
      roleGroups: [],
      attendanceRate: "0.0",
      statusTotals: {
        PRESENT: 0,
        ABSENT: 0,
        NOT_AVAILABLE: 0,
        HOLIDAY: 0,
      },
    });
  });
});
