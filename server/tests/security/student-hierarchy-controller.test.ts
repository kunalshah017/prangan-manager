import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getCenterByIdController,
} from "../../controllers/center.controller.js";
import { getProjectByIdController } from "../../controllers/project.controller.js";
import { getSemesterByIdController } from "../../controllers/semester.controller.js";
import {
  addStudent,
  deleteStudentController,
  getStudent,
  getStudentEnrollmentsController,
  updateStudentController,
} from "../../controllers/user.controller.js";
import { Role, SubRole } from "../../generated/prisma/index.js";
import { ACADEMIC_LEVEL_CODES } from "../helpers/academic-level-codes.js";
import { prisma } from "../../lib/prisma.js";

const createReply = () => {
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

const assignment = (
  overrides: Partial<{
    subRole: SubRole;
    projectId: string;
    centerId: string;
    semesterId: string;
    semesterLevelId: string;
  }> = {},
) => ({
  subRole: SubRole.CENTER_MANAGER,
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: null,
  isActive: true,
  ...overrides,
});

const studentScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
};

test("student routes expose only canonical semester-level lookup", async () => {
  const routes = await readFile(
    new URL("../../routes/user.route.ts", import.meta.url),
    "utf8",
  );
  const controller = await readFile(
    new URL("../../controllers/user.controller.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(routes, /\/users\/students\/level\/:level/);
  assert.match(
    routes,
    /\/users\/students\/semester-level\/:semesterLevelId/,
  );
  assert.match(controller, /semesterLevelId: string/);
  assert.doesNotMatch(controller, /getStudentsByLevelController/);
  assert.match(controller, /getStudentsBySemesterLevelController/);
});

test("project detail denies an unrelated assignment before the full project read", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalProjectFindUnique = prisma.projects.findUnique;
  let fullProjectReads = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({ projectId: "project-2" }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.projects.findUnique = (async (query: any) => {
    if (query.select) return { id: "project-1" };
    fullProjectReads += 1;
    return { id: "project-1", centers: [] };
  }) as typeof prisma.projects.findUnique;

  try {
    const response = createReply();
    await getProjectByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "project-1" } } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.equal(fullProjectReads, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.projects.findUnique = originalProjectFindUnique;
  }
});

test("project detail permits an active assignment for that project", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalProjectFindUnique = prisma.projects.findUnique;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment(),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.projects.findUnique = (async (query: any) =>
    query.select ? { id: "project-1" } : { id: "project-1", centers: [] },
  ) as typeof prisma.projects.findUnique;

  try {
    const response = createReply();
    await getProjectByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "project-1" } } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 200);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.projects.findUnique = originalProjectFindUnique;
  }
});

test("center detail permits its own assignment context and denies another center", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalCenterFindUnique = prisma.centers.findUnique;
  let fullCenterReads = 0;

  prisma.centers.findUnique = (async (query: any) => {
    if (query.select) return { projectId: "project-1" };
    fullCenterReads += 1;
    return { id: "center-1", projectId: "project-1", semesters: [] };
  }) as typeof prisma.centers.findUnique;

  try {
    prisma.userRoleAssignments.findMany = (async () => [
      assignment(),
    ]) as typeof prisma.userRoleAssignments.findMany;
    const allowedResponse = createReply();
    await getCenterByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "center-1" } } as any,
      allowedResponse.reply as any,
    );
    assert.equal(allowedResponse.statusCode, 200);
    assert.equal(fullCenterReads, 1);

    prisma.userRoleAssignments.findMany = (async () => [
      assignment({ centerId: "center-2" }),
    ]) as typeof prisma.userRoleAssignments.findMany;
    const deniedResponse = createReply();
    await getCenterByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "center-1" } } as any,
      deniedResponse.reply as any,
    );
    assert.equal(deniedResponse.statusCode, 403);
    assert.equal(fullCenterReads, 1);

    prisma.userRoleAssignments.findMany = (async () => [
      assignment({ projectId: "project-2" }),
    ]) as typeof prisma.userRoleAssignments.findMany;
    const wrongProjectResponse = createReply();
    await getCenterByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "center-1" } } as any,
      wrongProjectResponse.reply as any,
    );
    assert.equal(wrongProjectResponse.statusCode, 403);
    assert.equal(fullCenterReads, 1);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.centers.findUnique = originalCenterFindUnique;
  }
});

test("semester detail requires a matching full hierarchy scope before the full read", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  let fullSemesterReads = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({ semesterId: "semester-2" }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.semesters.findUnique = (async (query: any) => {
    if (query.select) {
      return {
        centerId: "center-1",
        center: { projectId: "project-1" },
      };
    }
    fullSemesterReads += 1;
    return { id: "semester-1" };
  }) as typeof prisma.semesters.findUnique;

  try {
    const response = createReply();
    await getSemesterByIdController(
      { user: { id: "user-1", role: Role.USER }, params: { id: "semester-1" } } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.equal(fullSemesterReads, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.semesters.findUnique = originalSemesterFindUnique;
  }
});

test("student detail denies an educator assigned to another level before the full read", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalStudentFindUnique = prisma.students.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let fullStudentReads = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({
      subRole: SubRole.EDUCATOR,
      semesterLevelId: "semester-1-level-2",
    }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.semesterLevel.findFirst = (async ({ where }: any) => ({
    id: where.id,
    academicLevel: {
      code:
        where.id === "semester-1-level-2" ? ACADEMIC_LEVEL_CODES.LEVEL_2 : ACADEMIC_LEVEL_CODES.LEVEL_1,
    },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.studentEnrollments.findMany = (async () => [
    studentScope,
  ]) as typeof prisma.studentEnrollments.findMany;
  prisma.students.findUnique = (async () => {
    fullStudentReads += 1;
    return { id: "student-1", enrollments: [] };
  }) as typeof prisma.students.findUnique;

  try {
    const response = createReply();
    await getStudent(
      { user: { id: "user-1", role: Role.USER }, params: { id: "student-1" } } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.equal(fullStudentReads, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.students.findUnique = originalStudentFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("a matching center manager can read and update a student", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalStudentFindUnique = prisma.students.findUnique;
  const originalStudentUpdate = prisma.students.update;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let updates = 0;
  let studentQuery: unknown;
  let studentUpdateQuery: unknown;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment(),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.studentEnrollments.findMany = (async () => [
    studentScope,
  ]) as typeof prisma.studentEnrollments.findMany;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.students.findUnique = (async (query: unknown) => {
    studentQuery = query;
    return {
      id: "student-1",
      name: "Student One",
      firstName: "Student",
      middleName: null,
      lastName: "One",
      enrollments: [],
    };
  }) as typeof prisma.students.findUnique;
  prisma.students.update = (async (query: unknown) => {
    updates += 1;
    studentUpdateQuery = query;
    return { id: "student-1" };
  }) as typeof prisma.students.update;

  try {
    const readResponse = createReply();
    await getStudent(
      { user: { id: "user-1", role: Role.USER }, params: { id: "student-1" } } as any,
      readResponse.reply as any,
    );
    assert.equal(readResponse.statusCode, 200);
    assert.deepEqual(studentQuery, {
      where: { id: "student-1" },
      include: {
        enrollments: {
          where: { isActive: true, OR: [studentScope] },
        },
      },
    });

    const updateResponse = createReply();
    await updateStudentController(
      {
        user: { id: "user-1", role: Role.USER },
        params: { id: "student-1" },
        body: { firstName: "Updated", middleName: "Rani", lastName: null },
      } as any,
      updateResponse.reply as any,
    );
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updates, 1);
    assert.deepEqual(studentUpdateQuery, {
      where: { id: "student-1" },
      data: {
        name: "Updated Rani",
        firstName: "Updated",
        middleName: "Rani",
        lastName: null,
      },
      include: { enrollments: true },
    });
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.students.findUnique = originalStudentFindUnique;
    prisma.students.update = originalStudentUpdate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("student detail and history only read matching active educator enrollments", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalStudentFindUnique = prisma.students.findUnique;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const studentQueries: unknown[] = [];
  const enrollmentQueries: unknown[] = [];

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({
      subRole: SubRole.EDUCATOR,
      semesterLevelId: "semester-1-level-1",
    }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.studentEnrollments.findMany = (async (query: unknown) => {
    if ((query as { select?: unknown }).select) return [studentScope];
    enrollmentQueries.push(query);
    return [{ ...studentScope, isActive: true }];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.students.findUnique = (async (query: unknown) => {
    studentQueries.push(query);
    return { id: "student-1", enrollments: [{ ...studentScope, isActive: true }] };
  }) as typeof prisma.students.findUnique;

  try {
    const detailResponse = createReply();
    await getStudent(
      { user: { id: "user-1", role: Role.USER }, params: { id: "student-1" } } as any,
      detailResponse.reply as any,
    );
    assert.equal(detailResponse.statusCode, 200);

    const historyResponse = createReply();
    await getStudentEnrollmentsController(
      { user: { id: "user-1", role: Role.USER }, params: { studentId: "student-1" } } as any,
      historyResponse.reply as any,
    );
    assert.equal(historyResponse.statusCode, 200);

    const visibleWhere = {
      isActive: true,
      OR: [studentScope],
    };
    assert.deepEqual(studentQueries, [
      {
        where: { id: "student-1" },
        include: { enrollments: { where: visibleWhere } },
      },
    ]);
    assert.deepEqual((enrollmentQueries[0] as { where: unknown }).where, {
      studentId: "student-1",
      ...visibleWhere,
    });
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.students.findUnique = originalStudentFindUnique;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("student enrollment history denies a mismatched active scope before reading history", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let historyReads = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({ centerId: "center-2" }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.studentEnrollments.findMany = (async (query: any) => {
    if (query.select) return [studentScope];
    historyReads += 1;
    return [];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    const response = createReply();
    await getStudentEnrollmentsController(
      { user: { id: "user-1", role: Role.USER }, params: { studentId: "student-1" } } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.equal(historyReads, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("student update without a matching active scope does not mutate", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalStudentUpdate = prisma.students.update;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let updates = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment({ centerId: "center-2" }),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.studentEnrollments.findMany = (async () => [
    studentScope,
  ]) as typeof prisma.studentEnrollments.findMany;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.students.update = (async () => {
    updates += 1;
    return { id: "student-1" };
  }) as typeof prisma.students.update;

  try {
    const response = createReply();
    await updateStudentController(
      {
        user: { id: "user-1", role: Role.USER },
        params: { id: "student-1" },
        body: { name: "Updated Student" },
      } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 403);
    assert.equal(updates, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.students.update = originalStudentUpdate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("non-admin student creation requires an enrollment, and a matching manager may create one", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalStudentCreate = prisma.students.create;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let createdStudents = 0;
  let enrollmentCreateData: Record<string, unknown> | undefined;

  try {
    const forbiddenResponse = createReply();
    await addStudent(
      {
        user: { id: "user-1", role: Role.USER },
        body: { name: "Unenrolled Student" },
      } as any,
      forbiddenResponse.reply as any,
    );
    assert.equal(forbiddenResponse.statusCode, 403);

    prisma.userRoleAssignments.findMany = (async () => [
      assignment(),
    ]) as typeof prisma.userRoleAssignments.findMany;
    prisma.centers.findUnique = (async () => ({
      projectId: "project-1",
    })) as typeof prisma.centers.findUnique;
    prisma.semesters.findUnique = (async () => ({
      centerId: "center-1",
    })) as typeof prisma.semesters.findUnique;
    prisma.students.create = (async (query: {
      data: {
        enrollments?: {
          create?: Record<string, unknown>[];
        };
      };
    }) => {
      createdStudents += 1;
      enrollmentCreateData = query.data.enrollments?.create?.[0];
      return {
        id: "student-1",
        enrollments: [{ id: "enrollment-1", ...enrollmentCreateData }],
      };
    }) as typeof prisma.students.create;
    prisma.semesterLevel.findFirst = (async () => ({
      id: "semester-1-level-1",
      academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
    })) as typeof prisma.semesterLevel.findFirst;

    const allowedResponse = createReply();
    await addStudent(
      {
        user: { id: "user-1", role: Role.USER },
        body: {
          name: "Enrolled Student",
          enrollment: {
            projectId: studentScope.projectId,
            centerId: studentScope.centerId,
            semesterId: studentScope.semesterId,
            semesterLevelId: studentScope.semesterLevelId,
          },
        },
      } as any,
      allowedResponse.reply as any,
    );
    assert.equal(allowedResponse.statusCode, 201);
    assert.equal(createdStudents, 1);
    assert.equal(
      enrollmentCreateData?.semesterLevelId,
      "semester-1-level-1",
    );
    assert.equal("level" in (enrollmentCreateData ?? {}), false);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.students.create = originalStudentCreate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("student creation rejects an invalid semester level before creating the student", async () => {
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalCenterFindUnique = prisma.centers.findUnique;
  const originalSemesterFindUnique = prisma.semesters.findUnique;
  const originalStudentCreate = prisma.students.create;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let createdStudents = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    assignment(),
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.centers.findUnique = (async () => ({
    projectId: studentScope.projectId,
  })) as typeof prisma.centers.findUnique;
  prisma.semesters.findUnique = (async () => ({
    centerId: studentScope.centerId,
  })) as typeof prisma.semesters.findUnique;
  prisma.semesterLevel.findFirst = (async () =>
    null) as typeof prisma.semesterLevel.findFirst;
  prisma.students.create = (async () => {
    createdStudents += 1;
    return { id: "student-1", enrollments: [] };
  }) as typeof prisma.students.create;

  try {
    const response = createReply();
    await addStudent(
      {
        user: { id: "user-1", role: Role.USER },
        body: {
          name: "Invalid Level Student",
          enrollment: {
            projectId: studentScope.projectId,
            centerId: studentScope.centerId,
            semesterId: studentScope.semesterId,
            semesterLevelId: "inactive-semester-level",
          },
        },
      } as any,
      response.reply as any,
    );

    assert.equal(response.statusCode, 422);
    assert.equal(createdStudents, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.centers.findUnique = originalCenterFindUnique;
    prisma.semesters.findUnique = originalSemesterFindUnique;
    prisma.students.create = originalStudentCreate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});
