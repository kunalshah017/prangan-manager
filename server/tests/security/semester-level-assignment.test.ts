import assert from "node:assert/strict";
import test from "node:test";

import { SubRole } from "../../generated/prisma/index.js";
import { ACADEMIC_LEVEL_CODES } from "../helpers/academic-level-codes.js";
import { prisma } from "../../lib/prisma.js";
import { updateUserManagementController } from "../../controllers/user.controller.js";
import { AcademicLevelServiceError } from "../../service/academic-level.service.js";
import {
  createUserRoleAssignment,
  bulkUpdateUserAssignments,
  getActiveUserScopeAssignments,
} from "../../service/user.service.js";

const createReply = () => {
  let statusCode: number | undefined;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send() {
      return this;
    },
  };
  return { reply, get statusCode() { return statusCode; } };
};

const mockHierarchy = () => {
  const originalSemesterFindFirst = prisma.semesters.findFirst;
  const originalCenterFindFirst = prisma.centers.findFirst;
  prisma.semesters.findFirst = (async () => ({
    id: "semester-1",
  })) as typeof prisma.semesters.findFirst;
  prisma.centers.findFirst = (async () => ({
    id: "center-1",
  })) as typeof prisma.centers.findFirst;
  return () => {
    prisma.semesters.findFirst = originalSemesterFindFirst;
    prisma.centers.findFirst = originalCenterFindFirst;
  };
};

test("educator assignment validates and writes only its semester level ID", async () => {
  const restoreHierarchy = mockHierarchy();
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalCreate = prisma.userRoleAssignments.create;
  let createArgs: unknown;

  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.userRoleAssignments.create = (async (args: unknown) => {
    createArgs = args;
    return { id: "assignment-1" };
  }) as typeof prisma.userRoleAssignments.create;

  try {
    await createUserRoleAssignment({
      userId: "educator-1",
      subRole: SubRole.EDUCATOR,
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-level-1",
    });

    assert.deepEqual((createArgs as any).data, {
      userId: "educator-1",
      subRole: SubRole.EDUCATOR,
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-level-1",
    });
    assert.equal("level" in (createArgs as any).data, false);
    assert.deepEqual((createArgs as any).include.semesterLevel, {
      include: { academicLevel: true },
    });
  } finally {
    restoreHierarchy();
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.userRoleAssignments.create = originalCreate;
  }
});

test("non-educator bulk assignments clear the semester level without a legacy field", async () => {
  const restoreHierarchy = mockHierarchy();
  const originalTransaction = prisma.$transaction;
  let createData: unknown;

  prisma.$transaction = (async (callback: any) =>
    callback({
      userRoleAssignments: {
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => {
          createData = data;
          return { id: "assignment-1" };
        },
      },
    })) as typeof prisma.$transaction;

  try {
    await bulkUpdateUserAssignments("manager-1", [
      {
        subRole: SubRole.CENTER_MANAGER,
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        semesterLevelId: "cached-id",
      },
    ]);

    assert.equal((createData as any).semesterLevelId, null);
    assert.equal("level" in (createData as any), false);
  } finally {
    restoreHierarchy();
    prisma.$transaction = originalTransaction;
  }
});

test("bulk assignment reconciliation preserves unchanged semester assignment IDs", async () => {
  const restoreHierarchy = mockHierarchy();
  const originalTransaction = prisma.$transaction;
  let createCalls = 0;
  let updateManyCalls = 0;

  prisma.$transaction = (async (callback: any) =>
    callback({
      userRoleAssignments: {
        findMany: async () => [
          {
            id: "assignment-existing",
            userId: "manager-1",
            subRole: SubRole.CENTER_MANAGER,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            semesterLevelId: null,
            committedDays: null,
            isActive: true,
          },
        ],
        updateMany: async () => {
          updateManyCalls += 1;
          return { count: 0 };
        },
        create: async () => {
          createCalls += 1;
          return { id: "assignment-created" };
        },
      },
    })) as typeof prisma.$transaction;

  try {
    const result = await bulkUpdateUserAssignments("manager-1", [
      {
        subRole: SubRole.CENTER_MANAGER,
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      },
    ]);

    assert.deepEqual(
      result.map((assignment: { id: string }) => assignment.id),
      ["assignment-existing"],
    );
    assert.equal(createCalls, 0);
    assert.equal(updateManyCalls, 0);
  } finally {
    restoreHierarchy();
    prisma.$transaction = originalTransaction;
  }
});

test("assignment rejects semesterLevelId without semesterId before Prisma create", async () => {
  const originalCreate = prisma.userRoleAssignments.create;
  let createCalls = 0;
  prisma.userRoleAssignments.create = (async () => {
    createCalls += 1;
    return { id: "assignment-1" };
  }) as typeof prisma.userRoleAssignments.create;

  try {
    const result = await createUserRoleAssignment({
      userId: "educator-1",
      subRole: SubRole.EDUCATOR,
      semesterLevelId: "semester-level-1",
    });
    assert.ok(result instanceof AcademicLevelServiceError);
    assert.equal(result.message, "Semester is required when semester level is provided");
    assert.equal(result.statusCode, 422);
    assert.equal(createCalls, 0);
  } finally {
    prisma.userRoleAssignments.create = originalCreate;
  }
});

test("semester-scoped educator assignment requires a canonical semester level", async () => {
  const restoreHierarchy = mockHierarchy();
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    const result = await bulkUpdateUserAssignments("educator-1", [
      {
        subRole: SubRole.EDUCATOR,
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
      },
    ]);
    assert.ok(result instanceof AcademicLevelServiceError);
    assert.equal(result.statusCode, 422);
    assert.equal(transactionCalls, 0);
  } finally {
    restoreHierarchy();
    prisma.$transaction = originalTransaction;
  }
});

test("management endpoint preserves invalid semester-level status", async () => {
  const restoreHierarchy = mockHierarchy();
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  prisma.semesterLevel.findFirst = (async () => null) as typeof prisma.semesterLevel.findFirst;

  try {
    const response = createReply();
    await updateUserManagementController(
      {
        user: { id: "admin-1", role: "ADMIN" },
        params: { userId: "educator-1" },
        body: {
          roleAssignments: [{
            subRole: SubRole.EDUCATOR,
            projectId: "project-1",
            centerId: "center-1",
            semesterId: "semester-1",
            semesterLevelId: "missing-level",
          }],
        },
      } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 422);
  } finally {
    restoreHierarchy();
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("canonical educator assignments are returned without legacy hydration", async () => {
  const originalFindMany = prisma.userRoleAssignments.findMany;
  let assignmentQuery: unknown;

  prisma.userRoleAssignments.findMany = (async (query: unknown) => {
    assignmentQuery = query;
    return [
      {
        subRole: SubRole.EDUCATOR,
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        semesterLevelId: "semester-1-level-1",
        semesterLevel: { isActive: true },
        isActive: true,
      },
    ];
  }) as typeof prisma.userRoleAssignments.findMany;

  try {
    const assignments = await getActiveUserScopeAssignments("educator-1");
    assert.notEqual(typeof assignments, "string");
    assert.equal((assignments as any)[0].semesterLevelId, "semester-1-level-1");
    assert.equal("level" in (assignments as any)[0], false);
    assert.deepEqual(assignmentQuery, {
      where: {
        userId: "educator-1",
        isActive: true,
        OR: [
          { subRole: { not: SubRole.EDUCATOR } },
          { semesterLevel: { is: { isActive: true } } },
        ],
      },
      select: {
        subRole: true,
        projectId: true,
        centerId: true,
        semesterId: true,
        semesterLevelId: true,
        semesterLevel: { select: { isActive: true } },
        isActive: true,
      },
    });
  } finally {
    prisma.userRoleAssignments.findMany = originalFindMany;
  }
});
