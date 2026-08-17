import assert from "node:assert/strict";
import test from "node:test";

import { SubRole } from "../../generated/prisma/index.js";
import { ACADEMIC_LEVEL_CODES } from "../helpers/academic-level-codes.js";
import { prisma } from "../../lib/prisma.js";
import {
  createUserRoleAssignment,
  bulkUpdateUserAssignments,
  getActiveUserScopeAssignments,
} from "../../service/user.service.js";

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
    assert.equal(
      result,
      "Semester is required when semester level is provided",
    );
    assert.equal(createCalls, 0);
  } finally {
    prisma.userRoleAssignments.create = originalCreate;
  }
});

test("canonical educator assignments are returned without legacy hydration", async () => {
  const originalFindMany = prisma.userRoleAssignments.findMany;

  prisma.userRoleAssignments.findMany = (async () => [
    {
      subRole: SubRole.EDUCATOR,
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      isActive: true,
    },
  ]) as typeof prisma.userRoleAssignments.findMany;

  try {
    const assignments = await getActiveUserScopeAssignments("educator-1");
    assert.notEqual(typeof assignments, "string");
    assert.equal((assignments as any)[0].semesterLevelId, "semester-1-level-1");
    assert.equal("level" in (assignments as any)[0], false);
  } finally {
    prisma.userRoleAssignments.findMany = originalFindMany;
  }
});
