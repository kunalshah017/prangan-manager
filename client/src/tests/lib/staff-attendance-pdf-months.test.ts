import { describe, expect, it } from "vitest";

import { groupStaffAttendanceRecordsByMonth } from "@/lib/staff-attendance-pdf-export";
import type { AttendanceRecord } from "@/types/api";

const record = (date: string): AttendanceRecord => ({
  id: date,
  userId: "educator-1",
  userName: "Asha",
  userEmail: "asha@example.com",
  date,
  status: "PRESENT",
  roleAssignmentId: "assignment-1",
  projectId: "project-1",
  projectName: "Project One",
  centerId: "center-1",
  centerName: "Tulip",
  semesterId: "semester-1",
  semesterName: "Semester 2026-27",
  createdAt: `${date}T12:00:00.000Z`,
  updatedAt: `${date}T12:00:00.000Z`,
  roleAssignment: { id: "assignment-1", subRole: "EDUCATOR" },
});

describe("staff attendance PDF month grouping", () => {
  it("creates one chronologically ordered export page group for each month", () => {
    expect(
      groupStaffAttendanceRecordsByMonth([
        record("2026-08-02"),
        record("2026-07-05"),
        record("2026-08-01"),
      ]),
    ).toEqual([
      expect.objectContaining({ key: "2026-07", label: "July 2026", records: [expect.objectContaining({ date: "2026-07-05" })] }),
      expect.objectContaining({ key: "2026-08", label: "August 2026", records: [expect.objectContaining({ date: "2026-08-02" }), expect.objectContaining({ date: "2026-08-01" })] }),
    ]);
  });
});
