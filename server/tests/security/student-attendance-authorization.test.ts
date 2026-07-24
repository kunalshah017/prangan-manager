import assert from "node:assert/strict";
import test from "node:test";

import { Level, Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  deleteStudentAttendance,
  getBulkAttendanceEstimate,
  getStudentAttendance,
  markBulkStudentAttendance,
  markStudentAttendance,
  updateStudentAttendance,
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

test("bulk attendance estimate accepts only canonical positive student counts", async () => {
  for (const studentCount of [
    "12junk",
    "1.9",
    "1e3",
    "0",
    "-1",
    " ",
    undefined,
  ]) {
    const response = createReply();
    await getBulkAttendanceEstimate(
      { query: studentCount === undefined ? {} : { studentCount } } as any,
      response.reply as any,
    );

    assert.equal(
      response.statusCode,
      400,
      `studentCount ${String(studentCount)}`,
    );
    assert.deepEqual(response.payload, {
      message: "Valid student count is required",
    });
  }

  const response = createReply();
  await getBulkAttendanceEstimate(
    { query: { studentCount: "150" } } as any,
    response.reply as any,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(
    (response.payload as { estimate: { studentCount: number } }).estimate
      .studentCount,
    150,
  );
});

const attendanceScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  enrollment: {
    level: Level.LEVEL_1,
    semesterLevelId: "semester-level-1",
  },
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

test("student attendance scope lookup selects only canonical scope and enrollment level", async () => {
  const originalFindUnique = prisma.studentAttendance.findUnique;
  let query: unknown;

  prisma.studentAttendance.findUnique = (async (args: unknown) => {
    query = args;
    return null;
  }) as typeof prisma.studentAttendance.findUnique;

  try {
    await StudentAttendanceService.getAttendanceScope("attendance-1");

    assert.deepEqual(query, {
      where: { id: "attendance-1" },
      select: {
        projectId: true,
        centerId: true,
        semesterId: true,
        enrollment: {
          select: { level: true, semesterLevelId: true },
        },
      },
    });
  } finally {
    prisma.studentAttendance.findUnique = originalFindUnique;
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
    return [
      { id: "enrollment-1", studentId: "student-1", level: Level.LEVEL_1 },
    ];
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
    { id: "enrollment-1", studentId: "student-1", level: Level.LEVEL_1 },
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

test("attendance updates reject linkage fields before looking up or mutating attendance", async () => {
  const service = StudentAttendanceService as any;
  const originalGetAttendanceScope = service.getAttendanceScope;
  const originalUpdateAttendance = service.updateAttendance;
  let scopeLookups = 0;
  let updateCalls = 0;
  service.getAttendanceScope = async () => {
    scopeLookups++;
    return attendanceScope;
  };
  service.updateAttendance = async () => {
    updateCalls++;
    return {};
  };

  try {
    const response = createReply();
    await updateStudentAttendance(
      {
        user: { id: "admin-1", role: Role.ADMIN },
        params: { attendanceId: "attendance-1" },
        body: { status: "PRESENT", projectId: "project-2" },
      } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(scopeLookups, 0);
    assert.equal(updateCalls, 0);
  } finally {
    service.getAttendanceScope = originalGetAttendanceScope;
    service.updateAttendance = originalUpdateAttendance;
  }
});

test("denied persisted attendance scope never invokes update or delete", async () => {
  const service = StudentAttendanceService as any;
  const originalGetAttendanceScope = service.getAttendanceScope;
  const originalUpdateAttendance = service.updateAttendance;
  const originalDeleteAttendance = service.deleteAttendance;
  const originalFindMany = prisma.userRoleAssignments.findMany;
  let updateCalls = 0;
  let deleteCalls = 0;
  service.getAttendanceScope = async () => attendanceScope;
  service.updateAttendance = async () => {
    updateCalls++;
    return {};
  };
  service.deleteAttendance = async () => {
    deleteCalls++;
  };
  prisma.userRoleAssignments.findMany =
    (async () => []) as typeof prisma.userRoleAssignments.findMany;

  try {
    for (const [controller, body] of [
      [updateStudentAttendance, { status: "PRESENT" }],
      [deleteStudentAttendance, undefined],
    ] as const) {
      const response = createReply();
      await controller(
        {
          user: { id: "educator-1", role: Role.USER },
          params: { attendanceId: "attendance-1" },
          body,
        } as any,
        response.reply as any,
      );

      assert.equal(response.statusCode, 403);
    }

    assert.equal(updateCalls, 0);
    assert.equal(deleteCalls, 0);
  } finally {
    service.getAttendanceScope = originalGetAttendanceScope;
    service.updateAttendance = originalUpdateAttendance;
    service.deleteAttendance = originalDeleteAttendance;
    prisma.userRoleAssignments.findMany = originalFindMany;
  }
});

test("attendance updates pass only allowlisted status data to the service", async () => {
  const service = StudentAttendanceService as any;
  const originalGetAttendanceScope = service.getAttendanceScope;
  const originalUpdateAttendance = service.updateAttendance;
  let updateArgs: unknown[] | undefined;
  service.getAttendanceScope = async () => attendanceScope;
  service.updateAttendance = async (...args: unknown[]) => {
    updateArgs = args;
    return { id: "attendance-1" };
  };

  try {
    const response = createReply();
    await updateStudentAttendance(
      {
        user: { id: "admin-1", role: Role.ADMIN },
        params: { attendanceId: "attendance-1" },
        body: { status: "PRESENT" },
      } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(updateArgs, [
      "attendance-1",
      { status: "PRESENT", holidayReason: null },
      "admin-1",
    ]);
  } finally {
    service.getAttendanceScope = originalGetAttendanceScope;
    service.updateAttendance = originalUpdateAttendance;
  }
});

test("attendance updates persist an explicit null holiday reason for non-holiday status", async () => {
  const originalFindUnique = prisma.studentAttendance.findUnique;
  const originalUpdate = prisma.studentAttendance.update;
  let updateData: unknown;
  prisma.studentAttendance.findUnique = (async () => ({
    id: "attendance-1",
  })) as typeof prisma.studentAttendance.findUnique;
  prisma.studentAttendance.update = (async (args: { data: unknown }) => {
    updateData = args.data;
    return { id: "attendance-1" };
  }) as typeof prisma.studentAttendance.update;

  try {
    await StudentAttendanceService.updateAttendance(
      "attendance-1",
      { status: "PRESENT", holidayReason: null },
      "admin-1",
    );

    assert.equal(
      (updateData as { holidayReason?: unknown }).holidayReason,
      null,
    );
  } finally {
    prisma.studentAttendance.findUnique = originalFindUnique;
    prisma.studentAttendance.update = originalUpdate;
  }
});

test("create and bulk attendance reject malformed or semantically invalid bodies before calling services", async () => {
  const service = StudentAttendanceService as any;
  const originalMarkAttendance = service.markAttendance;
  const originalMarkBulkAttendance = service.markBulkAttendance;
  let markAttendanceCalls = 0;
  let markBulkAttendanceCalls = 0;
  service.markAttendance = async () => {
    markAttendanceCalls++;
    return {};
  };
  service.markBulkAttendance = async () => {
    markBulkAttendanceCalls++;
    return { processedCount: 0, errors: [], attendances: [] };
  };

  const createBody = {
    studentId: "student-1",
    enrollmentId: "enrollment-1",
    date: "2026-07-18",
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    status: "PRESENT",
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
      [markStudentAttendance, null],
      [markBulkStudentAttendance, null],
      [markStudentAttendance, { ...createBody, status: "LATE" }],
      [markStudentAttendance, { ...createBody, status: "HOLIDAY" }],
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

    assert.equal(markAttendanceCalls, 0);
    assert.equal(markBulkAttendanceCalls, 0);
  } finally {
    service.markAttendance = originalMarkAttendance;
    service.markBulkAttendance = originalMarkBulkAttendance;
  }
});

test("admin create and bulk requests still require complete attendance context", async () => {
  const service = StudentAttendanceService as any;
  const originalMarkAttendance = service.markAttendance;
  const originalMarkBulkAttendance = service.markBulkAttendance;
  let markCalls = 0;
  service.markAttendance = async () => {
    markCalls++;
    return {};
  };
  service.markBulkAttendance = async () => {
    markCalls++;
    return { processedCount: 0, errors: [], attendances: [] };
  };

  try {
    for (const [controller, body] of [
      [
        markStudentAttendance,
        {
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          date: "2026-07-18",
        },
      ],
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
    service.markAttendance = originalMarkAttendance;
    service.markBulkAttendance = originalMarkBulkAttendance;
  }
});
