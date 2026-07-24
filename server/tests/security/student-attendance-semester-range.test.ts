import assert from "node:assert/strict";
import test from "node:test";

import { getStudentAttendance } from "../../controllers/student-attendance.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  StudentAttendanceWeekendDateError,
  StudentAttendanceSemesterDateError,
  StudentAttendanceService,
  assertStudentAttendanceDatesWithinSemester,
  assertStudentAttendanceWeekend,
} from "../../service/student-attendance.service.js";

const semester = {
  startDate: new Date("2025-07-01T00:00:00.000Z"),
  endDate: new Date("2026-04-30T00:00:00.000Z"),
};

test("semester attendance date guard accepts inclusive boundaries", async () => {
  const originalFindUnique = prisma.semesters.findUnique;
  prisma.semesters.findUnique = (async () =>
    semester) as typeof prisma.semesters.findUnique;

  try {
    await assertStudentAttendanceDatesWithinSemester("semester-1", [
      "2025-07-01",
      "2026-04-30",
    ]);
  } finally {
    prisma.semesters.findUnique = originalFindUnique;
  }
});

test("semester attendance date guard rejects dates outside the semester", async () => {
  const originalFindUnique = prisma.semesters.findUnique;
  prisma.semesters.findUnique = (async () =>
    semester) as typeof prisma.semesters.findUnique;

  try {
    for (const date of ["2025-06-30", "2026-05-01"]) {
      await assert.rejects(
        () => assertStudentAttendanceDatesWithinSemester("semester-1", [date]),
        (error: unknown) =>
          error instanceof StudentAttendanceSemesterDateError &&
          error.message ===
            "Attendance date must be between 2025-07-01 and 2026-04-30",
      );
    }
  } finally {
    prisma.semesters.findUnique = originalFindUnique;
  }
});

test("student attendance reads return 400 before querying records outside the semester", async () => {
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalAttendanceFindMany = prisma.studentAttendance.findMany;
  let attendanceQueries = 0;
  prisma.semesters.findUnique = (async () =>
    semester) as typeof prisma.semesters.findUnique;
  prisma.studentAttendance.findMany = (async () => {
    attendanceQueries += 1;
    return [];
  }) as typeof prisma.studentAttendance.findMany;

  let statusCode: number | undefined;
  let payload: unknown;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      return this;
    },
  };

  try {
    await getStudentAttendance(
      {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
        query: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          date: "2026-05-01",
        },
      } as never,
      reply as never,
    );

    assert.equal(statusCode, 400);
    assert.deepEqual(payload, {
      message: "Attendance date must be between 2025-07-01 and 2026-04-30",
    });
    assert.equal(attendanceQueries, 0);
  } finally {
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.studentAttendance.findMany = originalAttendanceFindMany;
  }
});

test("single attendance marking rejects an out-of-range date before upsert", async () => {
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalUpsert = prisma.studentAttendance.upsert;
  let upserts = 0;
  prisma.studentEnrollments.findFirst = (async () => ({
    id: "enrollment-1",
    studentId: "student-1",
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semester,
  })) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentAttendance.upsert = (async () => {
    upserts += 1;
    throw new Error("upsert should not run");
  }) as typeof prisma.studentAttendance.upsert;

  try {
    await assert.rejects(
      () =>
        StudentAttendanceService.markAttendance(
          {
            studentId: "student-1",
            enrollmentId: "enrollment-1",
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            date: "2026-05-02",
            status: "PRESENT",
          },
          "admin-1",
        ),
      StudentAttendanceSemesterDateError,
    );
    assert.equal(upserts, 0);
  } finally {
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentAttendance.upsert = originalUpsert;
  }
});

test("bulk attendance marking rejects an out-of-range date before enrollment processing", async () => {
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  let enrollmentQueries = 0;
  prisma.semesters.findUnique = (async () =>
    semester) as typeof prisma.semesters.findUnique;
  prisma.studentEnrollments.findMany = (async () => {
    enrollmentQueries += 1;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;

  try {
    await assert.rejects(
      () =>
        StudentAttendanceService.markBulkAttendance(
          {
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            date: "2025-06-29",
            status: "PRESENT",
            studentAttendances: [
              { studentId: "student-1", enrollmentId: "enrollment-1" },
            ],
          },
          "admin-1",
        ),
      StudentAttendanceSemesterDateError,
    );
    assert.equal(enrollmentQueries, 0);
  } finally {
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
  }
});

test("student attendance weekend guard accepts Saturday and Sunday and rejects weekdays", () => {
  assert.doesNotThrow(() => assertStudentAttendanceWeekend("2026-04-25"));
  assert.doesNotThrow(() => assertStudentAttendanceWeekend("2026-04-26"));
  assert.throws(
    () => assertStudentAttendanceWeekend("2026-04-27"),
    (error: unknown) =>
      error instanceof StudentAttendanceWeekendDateError &&
      error.message ===
        "Student attendance can only be marked on Saturday or Sunday",
  );
});

test("single attendance marking rejects a weekday before enrollment lookup", async () => {
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  let enrollmentQueries = 0;
  prisma.studentEnrollments.findFirst = (async () => {
    enrollmentQueries += 1;
    return null;
  }) as typeof prisma.studentEnrollments.findFirst;

  try {
    await assert.rejects(
      () =>
        StudentAttendanceService.markAttendance(
          {
            studentId: "student-1",
            enrollmentId: "enrollment-1",
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            date: "2026-04-27",
            status: "PRESENT",
          },
          "admin-1",
        ),
      StudentAttendanceWeekendDateError,
    );
    assert.equal(enrollmentQueries, 0);
  } finally {
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
  }
});

test("bulk attendance marking rejects a weekday before semester or enrollment lookup", async () => {
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  let semesterQueries = 0;
  let enrollmentQueries = 0;
  prisma.semesters.findUnique = (async () => {
    semesterQueries += 1;
    return semester;
  }) as typeof prisma.semesters.findUnique;
  prisma.studentEnrollments.findMany = (async () => {
    enrollmentQueries += 1;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;

  try {
    await assert.rejects(
      () =>
        StudentAttendanceService.markBulkAttendance(
          {
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            date: "2026-04-27",
            status: "PRESENT",
            studentAttendances: [
              { studentId: "student-1", enrollmentId: "enrollment-1" },
            ],
          },
          "admin-1",
        ),
      StudentAttendanceWeekendDateError,
    );
    assert.equal(semesterQueries, 0);
    assert.equal(enrollmentQueries, 0);
  } finally {
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
  }
});
