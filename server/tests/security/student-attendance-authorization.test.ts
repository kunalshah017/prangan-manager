import assert from "node:assert/strict";
import test from "node:test";

import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  getStudentAttendance,
  markBulkStudentAttendance,
} from "../../controllers/student-attendance.controller.js";
import { StudentAttendanceService } from "../../service/student-attendance.service.js";

const createReply = () => {
  let statusCode: number | undefined;
  let payload: unknown;
  let sent = false;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      sent = true;
      return this;
    },
    get sent() {
      return sent;
    },
  };

  return {
    reply,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
};

const mockSemesterBounds = () => {
  const originalFindUnique = prisma.semesters.findUnique;
  prisma.semesters.findUnique = (async () => ({
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T00:00:00.000Z"),
  })) as typeof prisma.semesters.findUnique;
  return () => {
    prisma.semesters.findUnique = originalFindUnique;
  };
};

test("student attendance reads pass internal semester-level IDs to the enrollment relation", async () => {
  const originalFindMany = prisma.studentAttendance.findMany;
  let query: unknown;

  prisma.studentAttendance.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.studentAttendance.findMany;

  try {
    await StudentAttendanceService.getAttendance(
      {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      },
      ["semester-level-1", "semester-level-primary-a"],
    );

    assert.deepEqual(
      (
        query as {
          where: { enrollment: { semesterLevelId: { in: string[] } } };
        }
      ).where.enrollment.semesterLevelId.in,
      ["semester-level-1", "semester-level-primary-a"],
    );
  } finally {
    prisma.studentAttendance.findMany = originalFindMany;
  }
});

test("bulk enrollment preflight restricts lookups to internal allowed levels", async () => {
  const originalFindMany = prisma.studentEnrollments.findMany;
  const restoreSemesterBounds = mockSemesterBounds();
  let query: unknown;

  prisma.studentEnrollments.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;

  try {
    const result = await StudentAttendanceService.markBulkAttendance(
      {
        date: "2026-07-18",
        status: "PRESENT",
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        studentAttendances: [
          { studentId: "student-1", enrollmentId: "enrollment-1" },
        ],
      },
      "educator-1",
      ["semester-level-1"],
    );

    assert.deepEqual(
      (query as { where: { semesterLevelId: { in: string[] } } }).where
        .semesterLevelId.in,
      ["semester-level-1"],
    );
    assert.equal(result.processedCount, 0);
    assert.equal(result.errors.length, 1);
  } finally {
    prisma.studentEnrollments.findMany = originalFindMany;
    restoreSemesterBounds();
  }
});

test("bulk enrollment preflight rejects swapped student and enrollment pairs", async () => {
  const originalFindMany = prisma.studentEnrollments.findMany;
  const originalTransaction = prisma.$transaction;
  const restoreSemesterBounds = mockSemesterBounds();
  let query: unknown;
  let transactionCalls = 0;

  prisma.studentEnrollments.findMany = (async (args: unknown) => {
    query = args;
    return [{ id: "enrollment-1", studentId: "student-1" }];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    const result = await StudentAttendanceService.markBulkAttendance(
      {
        date: "2026-07-18",
        status: "PRESENT",
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        studentAttendances: [
          { studentId: "student-1", enrollmentId: "enrollment-2" },
          { studentId: "student-2", enrollmentId: "enrollment-1" },
        ],
      },
      "educator-1",
      ["semester-level-1"],
    );

    const where = (query as { where: Record<string, unknown> }).where;
    assert.deepEqual(where.OR, [
      { id: "enrollment-2", studentId: "student-1" },
      { id: "enrollment-1", studentId: "student-2" },
    ]);
    assert.deepEqual(where.semesterLevelId, { in: ["semester-level-1"] });
    assert.equal(result.processedCount, 0);
    assert.equal(result.errors.length, 2);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.studentEnrollments.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
    restoreSemesterBounds();
  }
});

test("bulk attendance succeeds with unknown student details when post-commit enrichment fails", async () => {
  const originalFindMany = prisma.studentEnrollments.findMany;
  const originalTransaction = prisma.$transaction;
  const originalStudentsFindMany = prisma.students.findMany;
  const restoreSemesterBounds = mockSemesterBounds();
  prisma.studentEnrollments.findMany = (async () => [
    { id: "enrollment-1", studentId: "student-1" },
  ]) as typeof prisma.studentEnrollments.findMany;
  prisma.$transaction = (async () => [
    {
      id: "attendance-1",
      studentId: "student-1",
      date: new Date("2026-07-18T00:00:00.000Z"),
      status: "PRESENT",
    },
  ]) as typeof prisma.$transaction;
  prisma.students.findMany = (async () => {
    throw new Error("enrichment failed");
  }) as typeof prisma.students.findMany;

  try {
    const result = await StudentAttendanceService.markBulkAttendance(
      {
        date: "2026-07-18",
        status: "PRESENT",
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        studentAttendances: [
          { studentId: "student-1", enrollmentId: "enrollment-1" },
        ],
      },
      "educator-1",
      ["semester-level-1"],
    );

    assert.equal(result.processedCount, 1);
    assert.deepEqual(result.attendances[0]?.student, {
      id: "student-1",
      name: "Unknown",
    });
  } finally {
    prisma.studentEnrollments.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
    prisma.students.findMany = originalStudentsFindMany;
    restoreSemesterBounds();
  }
});

test("a malformed non-admin attendance list scope is denied before reading attendance", async () => {
  const service = StudentAttendanceService as any;
  const originalGetAttendance = service.getAttendance;
  let getAttendanceCalls = 0;
  service.getAttendance = async () => {
    getAttendanceCalls++;
    return [];
  };

  try {
    const response = createReply();
    await getStudentAttendance(
      {
        user: { id: "educator-1", role: Role.USER },
        query: { projectId: "project-1" },
      } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.payload, {
      message: "You are not authorized to manage student attendance",
    });
    assert.equal(getAttendanceCalls, 0);
  } finally {
    service.getAttendance = originalGetAttendance;
  }
});

test("bulk attendance rejects malformed or semantically invalid bodies before calling services", async () => {
  const service = StudentAttendanceService as any;
  const originalMarkBulkAttendance = service.markBulkAttendance;
  let markBulkAttendanceCalls = 0;
  service.markBulkAttendance = async () => {
    markBulkAttendanceCalls++;
    return { processedCount: 0, errors: [], attendances: [] };
  };

  const bulkBody = {
    date: "2026-07-18",
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    status: "PRESENT",
    studentAttendances: [
      { studentId: "student-1", enrollmentId: "enrollment-1" },
    ],
  };

  try {
    for (const [controller, body] of [
      [markBulkStudentAttendance, null],
      [markBulkStudentAttendance, { ...bulkBody, status: "LATE" }],
      [markBulkStudentAttendance, { ...bulkBody, status: "HOLIDAY" }],
    ] as const) {
      const response = createReply();
      await controller(
        { user: { id: "admin-1", role: Role.ADMIN }, body } as any,
        response.reply as any,
      );

      assert.equal(response.statusCode, 400);
    }

    assert.equal(markBulkAttendanceCalls, 0);
  } finally {
    service.markBulkAttendance = originalMarkBulkAttendance;
  }
});

test("admin bulk requests still require complete attendance context", async () => {
  const service = StudentAttendanceService as any;
  const originalMarkBulkAttendance = service.markBulkAttendance;
  let markCalls = 0;
  service.markBulkAttendance = async () => {
    markCalls++;
    return { processedCount: 0, errors: [], attendances: [] };
  };

  try {
    for (const [controller, body] of [
      [
        markBulkStudentAttendance,
        {
          date: "2026-07-18",
          status: "PRESENT",
          studentAttendances: [
            { studentId: "student-1", enrollmentId: "enrollment-1" },
          ],
        },
      ],
    ] as const) {
      const response = createReply();
      await controller(
        { user: { id: "admin-1", role: Role.ADMIN }, body } as any,
        response.reply as any,
      );

      assert.equal(response.statusCode, 400);
    }

    assert.equal(markCalls, 0);
  } finally {
    service.markBulkAttendance = originalMarkBulkAttendance;
  }
});
