import assert from "node:assert/strict";
import test from "node:test";

import { CommittedDays } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  getActiveUsersForAttendance,
  getAttendanceRecords,
  getAttendanceSummary,
  getRelevantCommittedDays,
} from "../../service/attendance.service.js";

test("relevant committed days use UTC Saturday instead of a simulated negative-offset Friday", () => {
  const originalGetDay = Date.prototype.getDay;
  const originalGetUTCDay = Date.prototype.getUTCDay;
  Date.prototype.getDay = () => 5;
  Date.prototype.getUTCDay = () => 6;

  try {
    assert.deepEqual(getRelevantCommittedDays("2026-07-18"), [
      CommittedDays.SATURDAY,
      CommittedDays.BOTH,
    ]);
  } finally {
    Date.prototype.getDay = originalGetDay;
    Date.prototype.getUTCDay = originalGetUTCDay;
  }
});

test("relevant committed days select Saturday, Sunday, or neither for UTC dates", () => {
  assert.deepEqual(getRelevantCommittedDays("2026-07-18"), [
    CommittedDays.SATURDAY,
    CommittedDays.BOTH,
  ]);
  assert.deepEqual(getRelevantCommittedDays("2026-07-19"), [
    CommittedDays.SUNDAY,
    CommittedDays.BOTH,
  ]);
  assert.deepEqual(getRelevantCommittedDays("2026-07-20"), []);
});

test("attendance summary counts UTC weekend dates despite a simulated negative-offset weekday", async () => {
  const originalFindMany = prisma.userAttendance.findMany;
  const originalGetDay = Date.prototype.getDay;
  prisma.userAttendance.findMany =
    (async () => []) as typeof prisma.userAttendance.findMany;
  Date.prototype.getDay = () => 5;

  try {
    const summary = await getAttendanceSummary({
      startDate: "2026-07-18",
      endDate: "2026-07-19",
    });

    assert.equal(summary.periodInfo.weekendDays, 2);
  } finally {
    prisma.userAttendance.findMany = originalFindMany;
    Date.prototype.getDay = originalGetDay;
  }
});

test("active user attendance selection returns every active staff assignment in the exact weekend context", async () => {
  const originalFindMany = prisma.user.findMany;
  const queries: unknown[] = [];
  prisma.user.findMany = (async (query: unknown) => {
    queries.push(query);
    return [];
  }) as typeof prisma.user.findMany;

  const request = {
    semesterId: "semester-1",
    centerId: "center-1",
    projectId: "project-1",
  };

  try {
    await getActiveUsersForAttendance({ ...request, date: "2026-07-18" });
    await getActiveUsersForAttendance({ ...request, date: "2026-07-19" });
    const weekdayResult = await getActiveUsersForAttendance({
      ...request,
      date: "2026-07-20",
    });

    assert.equal(queries.length, 2);
    for (const query of queries as any[]) {
      assert.deepEqual(query.where, {
        status: "APPROVED",
        roleAssignments: {
          some: {
            isActive: true,
            subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] },
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
          },
        },
      });
      assert.deepEqual(query.include.roleAssignments.where, {
        isActive: true,
        subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] },
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      });
      assert.equal(
        Object.hasOwn(query.where.roleAssignments.some, "committedDays"),
        false,
      );
      assert.equal(
        Object.hasOwn(query.include.roleAssignments.where, "committedDays"),
        false,
      );
    }
    assert.deepEqual(weekdayResult, { users: [], totalUsers: 0 });
  } finally {
    prisma.user.findMany = originalFindMany;
  }
});

test("attendance records include the staff profile image used by the client matrix", async () => {
  const originalFindMany = prisma.userAttendance.findMany;
  const originalCount = prisma.userAttendance.count;
  let query: any;
  prisma.userAttendance.findMany = (async (input: unknown) => {
    query = input;
    return [
      {
        id: "attendance-1",
        userId: "user-1",
        user: {
          name: "Aditi Ratnaparkhi",
          email: "aditi@example.com",
          profileImageUrl: "https://images.example/aditi.jpg",
        },
        date: new Date("2026-07-18T00:00:00.000Z"),
        status: "PRESENT",
        projectId: "project-1",
        project: { name: "Project" },
        centerId: "center-1",
        center: { name: "Center" },
        semesterId: "semester-1",
        semester: { name: "Semester" },
        notes: null,
        holidayReason: null,
        markedBy: null,
        markedByUser: null,
        markedAt: new Date("2026-07-18T10:00:00.000Z"),
        roleAssignment: {
          id: "assignment-1",
          subRole: "EDUCATOR",
          committedDays: "BOTH",
        },
      },
    ];
  }) as typeof prisma.userAttendance.findMany;
  prisma.userAttendance.count = (async () =>
    1) as typeof prisma.userAttendance.count;

  try {
    const result = await getAttendanceRecords({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
    });

    assert.equal(query.include.user.select.profileImageUrl, true);
    assert.deepEqual(result.attendances[0].user, {
      id: "user-1",
      name: "Aditi Ratnaparkhi",
      email: "aditi@example.com",
      profileImageUrl: "https://images.example/aditi.jpg",
    });
  } finally {
    prisma.userAttendance.findMany = originalFindMany;
    prisma.userAttendance.count = originalCount;
  }
});
