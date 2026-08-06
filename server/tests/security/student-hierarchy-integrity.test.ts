import assert from "node:assert/strict";
import test from "node:test";

import { deleteCenterController } from "../../controllers/center.controller.js";
import { deleteProjectController } from "../../controllers/project.controller.js";
import { deleteSemesterController } from "../../controllers/semester.controller.js";
import { deleteStudentController } from "../../controllers/user.controller.js";
import { Level, Role, SubRole } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { deleteCenter, getCenterScope } from "../../service/center.service.js";
import {
  deleteProject,
  getProjectScope,
} from "../../service/project.service.js";
import { deleteSemester } from "../../service/semester.service.js";
import {
  createEnrollment,
  deleteStudent,
  enrollStudent,
  updateEnrollment,
  getEnrollmentScope,
  getStudentActiveEnrollmentScopes,
  getStudentById,
  getStudentEnrollments,
  getUserAccessibleStudents,
  resolveEffectiveEnrollmentContext,
  validateEnrollmentHierarchy,
} from "../../service/user.service.js";
import { getSemesterScope } from "../../service/semester.service.js";

test("scope helpers select only the hierarchy fields needed for authorization", async () => {
  const originalProjectFindUnique = prisma.projects.findUnique;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const queries: Record<string, unknown> = {};

  prisma.projects.findUnique = (async (query: unknown) => {
    queries.project = query;
    return { id: "project-1" };
  }) as typeof prisma.projects.findUnique;
  prisma.centers.findUnique = (async (query: unknown) => {
    queries.center = query;
    return { projectId: "project-1" };
  }) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async (query: unknown) => {
    queries.semester = query;
    return { centerId: "center-1", center: { projectId: "project-1" } };
  }) as typeof prisma.semesters.findUnique;
  prisma.studentEnrollments.findUnique = (async (query: unknown) => {
    queries.enrollment = query;
    return {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      level: Level.LEVEL_1,
    };
  }) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findMany = (async (query: unknown) => {
    queries.student = query;
    return [
      {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        semesterLevelId: "semester-1-level-1",
        level: Level.LEVEL_1,
      },
    ];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    assert.deepEqual(await getProjectScope("project-1"), {
      projectId: "project-1",
    });
    assert.deepEqual(await getCenterScope("center-1"), {
      projectId: "project-1",
      centerId: "center-1",
    });
    assert.deepEqual(await getSemesterScope("semester-1"), {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
    });
    assert.deepEqual(await getEnrollmentScope("enrollment-1"), {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      level: Level.LEVEL_1,
    });
    assert.deepEqual(await getStudentActiveEnrollmentScopes("student-1"), [
      {
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        semesterLevelId: "semester-1-level-1",
        level: Level.LEVEL_1,
      },
    ]);

    assert.deepEqual(queries.project, {
      where: { id: "project-1" },
      select: { id: true },
    });
    assert.deepEqual(queries.center, {
      where: { id: "center-1" },
      select: { projectId: true },
    });
    assert.deepEqual(queries.semester, {
      where: { id: "semester-1" },
      select: { centerId: true, center: { select: { projectId: true } } },
    });
    assert.deepEqual(queries.enrollment, {
      where: { id: "enrollment-1" },
      select: {
        projectId: true,
        centerId: true,
        semesterId: true,
        semesterLevelId: true,
        level: true,
      },
    });
    assert.deepEqual(queries.student, {
      where: { studentId: "student-1", isActive: true },
      select: {
        projectId: true,
        centerId: true,
        semesterId: true,
        semesterLevelId: true,
        level: true,
      },
    });
  } finally {
    prisma.projects.findUnique = originalProjectFindUnique;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("legacy-only enrollment scopes resolve to verified semester level IDs", async () => {
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;

  prisma.studentEnrollments.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: null,
    level: Level.LEVEL_1,
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    assert.deepEqual(await getEnrollmentScope("enrollment-1"), {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      level: Level.LEVEL_1,
    });
  } finally {
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("enrollment scope rejects a mismatched semester level ID and legacy code", async () => {
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;

  prisma.studentEnrollments.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-1-level-2",
    level: Level.LEVEL_1,
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-2",
    academicLevel: { code: Level.LEVEL_2 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    await assert.rejects(
      () => getEnrollmentScope("enrollment-1"),
      /Semester level does not match legacy level/,
    );
  } finally {
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("scoped student detail and history query only active exact enrollment contexts", async () => {
  const originalStudentFindUnique = prisma.students.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const queries: Record<string, unknown> = {};
  const scopes = [
    {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      level: Level.LEVEL_1,
    },
  ];

  prisma.students.findUnique = (async (query: unknown) => {
    queries.student = query;
    return { id: "student-1", enrollments: [] };
  }) as typeof prisma.students.findUnique;
  prisma.studentEnrollments.findMany = (async (query: unknown) => {
    queries.enrollments = query;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;

  try {
    await getStudentById("student-1", scopes);
    await getStudentEnrollments("student-1", scopes);

    const visibleWhere = {
      isActive: true,
      OR: scopes.map(({ level: _level, ...scope }) => scope),
    };
    assert.deepEqual(queries.student, {
      where: { id: "student-1" },
      include: { enrollments: { where: visibleWhere } },
    });
    assert.deepEqual((queries.enrollments as { where: unknown }).where, {
      studentId: "student-1",
      ...visibleWhere,
    });
  } finally {
    prisma.students.findUnique = originalStudentFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
  }
});

test("student list derives complete educator contexts and preserves level restrictions", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  let enrollmentQuery: unknown;

  prisma.userRoleAssignments.findMany = (async () => [
    {
      subRole: SubRole.EDUCATOR,
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      level: Level.LEVEL_1,
      isActive: true,
    },
    {
      subRole: SubRole.CENTER_MANAGER,
      projectId: "project-incomplete",
      centerId: null,
      semesterId: "semester-1",
      level: null,
      isActive: true,
    },
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.studentEnrollments.findMany = (async (query: unknown) => {
    enrollmentQuery = query;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;

  try {
    await getUserAccessibleStudents("user-1", Role.USER, {
      level: Level.LEVEL_2,
    });
    assert.deepEqual((enrollmentQuery as { where: unknown }).where, {
      level: Level.LEVEL_2,
      OR: [
        {
          isActive: true,
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          semesterLevelId: "semester-1-level-1",
        },
      ],
    });
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
  }
});

test("validateEnrollmentHierarchy rejects a center outside the requested project", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  let semesterLookups = 0;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-2",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => {
    semesterLookups += 1;
    return { centerId: "center-1" };
  }) as typeof prisma.semesters.findUnique;

  try {
    assert.equal(
      await validateEnrollmentHierarchy({
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      }),
      "Center does not belong to project",
    );
    assert.equal(semesterLookups, 0);
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
  }
});

test("validateEnrollmentHierarchy rejects a semester outside the requested center", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-2",
  })) as typeof prisma.semesters.findUnique;

  try {
    assert.equal(
      await validateEnrollmentHierarchy({
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      }),
      "Semester does not belong to center",
    );
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
  }
});

test("resolveEffectiveEnrollmentContext merges a partial patch before validating it", async () => {
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;

  prisma.studentEnrollments.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-1-level-1",
    level: Level.LEVEL_1,
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-2",
  })) as typeof prisma.semesters.findUnique;

  try {
    assert.equal(
      await resolveEffectiveEnrollmentContext("enrollment-1", {
        level: Level.LEVEL_2,
      }),
      "Semester does not belong to center",
    );
  } finally {
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("project and center deletion reject before a transaction when enrollments exist", async () => {
  const originalEnrollmentCount = prisma.studentEnrollments.count;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.studentEnrollments.count = (async () =>
    1) as typeof prisma.studentEnrollments.count;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
  }) as typeof prisma.$transaction;

  try {
    assert.equal(
      await deleteProject("project-1"),
      "Cannot delete project while enrollments exist",
    );
    assert.equal(
      await deleteCenter("center-1"),
      "Cannot delete center while enrollments exist",
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.studentEnrollments.count = originalEnrollmentCount;
    prisma.$transaction = originalTransaction;
  }
});

test("project and center deletion controllers return 409 enrollment conflicts", async () => {
  const originalEnrollmentCount = prisma.studentEnrollments.count;
  const originalConsoleError = console.error;
  const responses: Array<{ code: number; body: unknown }> = [];
  const reply = {
    status(code: number) {
      return {
        send(body: unknown) {
          responses.push({ code, body });
        },
      };
    },
  };

  prisma.studentEnrollments.count = (async () =>
    1) as typeof prisma.studentEnrollments.count;

  try {
    await deleteProjectController(
      { user: { role: "ADMIN" }, params: { id: "project-1" } } as any,
      reply as any,
    );
    await deleteCenterController(
      { user: { role: "ADMIN" }, params: { id: "center-1" } } as any,
      reply as any,
    );

    assert.deepEqual(responses, [
      {
        code: 409,
        body: { message: "Cannot delete project while enrollments exist" },
      },
      {
        code: 409,
        body: { message: "Cannot delete center while enrollments exist" },
      },
    ]);

    prisma.studentEnrollments.count = (async () => {
      throw new Error("database details");
    }) as typeof prisma.studentEnrollments.count;
    console.error = () => {};

    await deleteProjectController(
      { user: { role: "ADMIN" }, params: { id: "project-1" } } as any,
      reply as any,
    );
    await deleteCenterController(
      { user: { role: "ADMIN" }, params: { id: "center-1" } } as any,
      reply as any,
    );

    assert.deepEqual(responses.slice(2), [
      { code: 500, body: { message: "Internal Server Error" } },
      { code: 500, body: { message: "Internal Server Error" } },
    ]);
  } finally {
    prisma.studentEnrollments.count = originalEnrollmentCount;
    console.error = originalConsoleError;
  }
});

test("semester and student deletion reject enrollment conflicts before delete and return 409", async () => {
  const originalEnrollmentCount = prisma.studentEnrollments.count;
  const originalSemesterDelete = prisma.semesters.delete;
  const originalStudentDelete = prisma.students.delete;
  let deletes = 0;
  const responses: Array<{ code: number; body: unknown }> = [];
  const reply = {
    status(code: number) {
      return {
        send(body: unknown) {
          responses.push({ code, body });
        },
      };
    },
  };

  prisma.studentEnrollments.count = (async () =>
    1) as typeof prisma.studentEnrollments.count;
  prisma.semesters.delete = (async () => {
    deletes += 1;
    return { id: "semester-1" };
  }) as typeof prisma.semesters.delete;
  prisma.students.delete = (async () => {
    deletes += 1;
    return { id: "student-1" };
  }) as typeof prisma.students.delete;

  try {
    assert.equal(
      await deleteSemester("semester-1"),
      "Cannot delete semester while enrollments exist",
    );
    assert.equal(
      await deleteStudent("student-1"),
      "Cannot delete student while enrollments exist",
    );
    assert.equal(deletes, 0);

    await deleteSemesterController(
      { user: { role: Role.ADMIN }, params: { id: "semester-1" } } as any,
      reply as any,
    );
    await deleteStudentController(
      { user: { role: Role.ADMIN }, params: { id: "student-1" } } as any,
      reply as any,
    );

    assert.deepEqual(responses, [
      {
        code: 409,
        body: { message: "Cannot delete semester while enrollments exist" },
      },
      {
        code: 409,
        body: { message: "Cannot delete student while enrollments exist" },
      },
    ]);
  } finally {
    prisma.studentEnrollments.count = originalEnrollmentCount;
    prisma.semesters.delete = originalSemesterDelete;
    prisma.students.delete = originalStudentDelete;
  }
});

test("project and center deletion run their dependent deletes inside transactions", async () => {
  const originalEnrollmentCount = prisma.studentEnrollments.count;
  const originalTransaction = prisma.$transaction;
  const operations: string[] = [];
  const transactionCalls: unknown[] = [];
  const transactionClient = {
    semesters: {
      deleteMany: async () => {
        operations.push("semesters.deleteMany");
      },
    },
    centers: {
      deleteMany: async () => {
        operations.push("centers.deleteMany");
      },
      delete: async () => {
        operations.push("centers.delete");
        return { id: "center-1" };
      },
    },
    projects: {
      delete: async () => {
        operations.push("projects.delete");
        return { id: "project-1" };
      },
    },
  };

  prisma.studentEnrollments.count = (async () =>
    0) as typeof prisma.studentEnrollments.count;
  prisma.$transaction = (async (callback: unknown) => {
    transactionCalls.push(callback);
    return (callback as (client: typeof transactionClient) => unknown)(
      transactionClient,
    );
  }) as typeof prisma.$transaction;

  try {
    assert.deepEqual(await deleteProject("project-1"), { id: "project-1" });
    assert.deepEqual(operations, [
      "semesters.deleteMany",
      "centers.deleteMany",
      "projects.delete",
    ]);

    operations.length = 0;
    assert.deepEqual(await deleteCenter("center-1"), { id: "center-1" });
    assert.deepEqual(operations, ["semesters.deleteMany", "centers.delete"]);
    assert.equal(transactionCalls.length, 2);
  } finally {
    prisma.studentEnrollments.count = originalEnrollmentCount;
    prisma.$transaction = originalTransaction;
  }
});

test("updateEnrollment rejects a partial semester patch that conflicts with its stored center", async () => {
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.studentEnrollments.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-1-level-1",
    level: Level.LEVEL_1,
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-2",
  })) as typeof prisma.semesters.findUnique;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
  }) as typeof prisma.$transaction;

  try {
    assert.equal(
      await updateEnrollment("enrollment-1", { semesterId: "semester-2" }),
      "Semester does not belong to center",
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.$transaction = originalTransaction;
  }
});

test("updateEnrollment derives the legacy level from a newly selected semester level", async () => {
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalTransaction = prisma.$transaction;
  let updateData: unknown;

  prisma.studentEnrollments.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-1-level-1",
    level: Level.LEVEL_1,
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-1",
  })) as typeof prisma.semesters.findUnique;
  prisma.semesterLevel.findFirst = (async ({ where }: any) => ({
    id: where.id,
    academicLevel: {
      code:
        where.id === "semester-1-level-2" ? Level.LEVEL_2 : Level.LEVEL_1,
    },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.$transaction = (async (callback: any) =>
    callback({
      studentEnrollments: {
        findUnique: async () => ({ studentId: "student-1" }),
        update: async ({ data }: { data: unknown }) => {
          updateData = data;
          return { id: "enrollment-1", ...data };
        },
      },
    })) as typeof prisma.$transaction;

  try {
    await updateEnrollment("enrollment-1", {
      semesterLevelId: "semester-1-level-2",
    });
    assert.deepEqual(updateData, {
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-2",
      level: Level.LEVEL_2,
      isActive: undefined,
    });
  } finally {
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.$transaction = originalTransaction;
  }
});

test("createEnrollment rejects a center outside the requested project before creating", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;
  let semesterLookups = 0;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-2",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => {
    semesterLookups += 1;
    return { centerId: "center-1" };
  }) as typeof prisma.semesters.findUnique;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
  }) as typeof prisma.$transaction;

  try {
    assert.equal(
      await createEnrollment(
        "student-1",
        "center-1",
        "semester-1",
        "project-1",
        Level.LEVEL_1,
      ),
      "Center does not belong to project",
    );
    assert.equal(semesterLookups, 0);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.$transaction = originalTransaction;
  }
});

test("enrollStudent rejects a semester outside the requested center before creating", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalEnrollmentCreate = prisma.studentEnrollments.create;
  let createCalls = 0;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-2",
  })) as typeof prisma.semesters.findUnique;
  prisma.studentEnrollments.create = (async () => {
    createCalls += 1;
  }) as typeof prisma.studentEnrollments.create;

  try {
    assert.equal(
      await enrollStudent({
        studentId: "student-1",
        centerId: "center-1",
        semesterId: "semester-1",
        projectId: "project-1",
        level: Level.LEVEL_1,
      }),
      "Semester does not belong to center",
    );
    assert.equal(createCalls, 0);
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.studentEnrollments.create = originalEnrollmentCreate;
  }
});

test("createEnrollment validates a semester level ID and dual-writes its legacy code", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalTransaction = prisma.$transaction;
  let semesterLevelQuery: unknown;
  let updateManyQuery: unknown;
  let createQuery: unknown;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-1",
  })) as typeof prisma.semesters.findUnique;
  prisma.semesterLevel.findFirst = (async (query: unknown) => {
    semesterLevelQuery = query;
    return {
      id: "semester-level-1",
      academicLevel: { code: Level.LEVEL_1 },
    };
  }) as typeof prisma.semesterLevel.findFirst;
  prisma.$transaction = (async (callback: any) =>
    callback({
      studentEnrollments: {
        updateMany: async (query: unknown) => {
          updateManyQuery = query;
          return { count: 0 };
        },
        create: async (query: unknown) => {
          createQuery = query;
          return { id: "enrollment-1" };
        },
      },
    })) as typeof prisma.$transaction;

  try {
    await createEnrollment(
      "student-1",
      "center-1",
      "semester-1",
      "project-1",
      undefined,
      "semester-level-1",
    );

    assert.deepEqual(semesterLevelQuery, {
      where: {
        id: "semester-level-1",
        semesterId: "semester-1",
        isActive: true,
      },
      include: { academicLevel: true },
    });
    assert.deepEqual((createQuery as any).data, {
      studentId: "student-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-level-1",
      projectId: "project-1",
      level: Level.LEVEL_1,
      isActive: true,
    });
    assert.deepEqual((createQuery as any).include.semesterLevel, {
      include: { academicLevel: true },
    });
    assert.deepEqual((updateManyQuery as any).where, {
      studentId: "student-1",
      semesterId: "semester-1",
      isActive: true,
    });
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.$transaction = originalTransaction;
  }
});

test("createEnrollment resolves a legacy level and dual-writes its semester level ID", async () => {
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalTransaction = prisma.$transaction;
  let semesterLevelQuery: unknown;
  let createData: unknown;

  prisma.centers.findUnique = (async () => ({
    projectId: "project-1",
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: "center-1",
  })) as typeof prisma.semesters.findUnique;
  prisma.semesterLevel.findFirst = (async (query: unknown) => {
    semesterLevelQuery = query;
    return {
      id: "semester-level-1",
      academicLevel: { code: Level.LEVEL_1 },
    };
  }) as typeof prisma.semesterLevel.findFirst;
  prisma.$transaction = (async (callback: any) =>
    callback({
      studentEnrollments: {
        updateMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => {
          createData = data;
          return { id: "enrollment-1" };
        },
      },
    })) as typeof prisma.$transaction;

  try {
    await createEnrollment(
      "student-1",
      "center-1",
      "semester-1",
      "project-1",
      Level.LEVEL_1,
    );

    assert.deepEqual(semesterLevelQuery, {
      where: {
        semesterId: "semester-1",
        isActive: true,
        academicLevel: { code: Level.LEVEL_1 },
      },
      include: { academicLevel: true },
    });
    assert.equal((createData as any).semesterLevelId, "semester-level-1");
    assert.equal((createData as any).level, Level.LEVEL_1);
  } finally {
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.$transaction = originalTransaction;
  }
});
