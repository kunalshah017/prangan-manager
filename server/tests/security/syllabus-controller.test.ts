import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Role, SubRole, Level } from "../../generated/prisma/index.js";
import {
  createTopicController,
  deleteSyllabusController,
  getProgressLogsController,
  getStatisticsController,
  getSyllabiController,
  importTemplateController,
  reorderTopicsController,
  updateSyllabusController,
  updateTopicController,
  updateTopicStatusController,
} from "../../controllers/syllabus.controller.js";
import { prisma } from "../../lib/prisma.js";

const scope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  level: Level.LEVEL_1,
};

const wrongScopeAssignment = {
  subRole: SubRole.CENTER_MANAGER,
  projectId: "project-2",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: null,
  level: Level.LEVEL_1,
  isActive: true,
};

const replyDouble = () => {
  let statusCode = 200;
  let payload: unknown;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      return value;
    },
  };
  return { reply, result: () => ({ statusCode, payload }) };
};

const user = (role: Role) => ({
  id: "user-1",
  name: "User",
  email: "user@example.com",
  role,
});

const mockSemesterLevels = () => {
  const originalFindFirst = prisma.semesterLevel.findFirst;
  prisma.semesterLevel.findFirst = (async ({ where }: any) => {
    const id = where.id ?? "semester-1-level-1";
    return {
      id,
      academicLevel: {
        code: id === "semester-1-level-2" ? Level.LEVEL_2 : Level.LEVEL_1,
      },
    };
  }) as typeof prisma.semesterLevel.findFirst;
  return () => {
    prisma.semesterLevel.findFirst = originalFindFirst;
  };
};

test("wrong-scope user cannot create a topic before the topic service writes", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalAssignmentsFindMany = prisma.userRoleAssignments.findMany;
  const originalTopicCreate = prisma.syllabusTopic.create;
  let topicCreateCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    scope) as typeof prisma.syllabus.findUnique;
  prisma.userRoleAssignments.findMany = (async () => [
    wrongScopeAssignment,
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.syllabusTopic.create = (async () => {
    topicCreateCalls += 1;
    return {} as never;
  }) as typeof prisma.syllabusTopic.create;

  try {
    const response = replyDouble();
    await createTopicController(
      {
        user: user(Role.USER),
        body: {
          syllabusId: "syllabus-1",
          serialNumber: "1",
          title: "Topic",
          cycle: "SA_1",
          orderIndex: 0,
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 403);
    assert.equal(topicCreateCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.userRoleAssignments.findMany = originalAssignmentsFindMany;
    prisma.syllabusTopic.create = originalTopicCreate;
    restoreSemesterLevels();
  }
});

test("educator assigned to another level cannot update a topic status", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  const originalAssignmentsFindMany = prisma.userRoleAssignments.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.syllabusTopic.findUnique = (async () => ({
    syllabus: scope,
  })) as typeof prisma.syllabusTopic.findUnique;
  prisma.userRoleAssignments.findMany = (async () => [
    {
      ...wrongScopeAssignment,
      subRole: SubRole.EDUCATOR,
      semesterLevelId: "semester-1-level-2",
      level: Level.LEVEL_2,
    },
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    const response = replyDouble();
    await updateTopicStatusController(
      {
        user: user(Role.USER),
        params: { id: "topic-1" },
        body: { status: "COMPLETED" },
      } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 403);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
    prisma.userRoleAssignments.findMany = originalAssignmentsFindMany;
    prisma.$transaction = originalTransaction;
    restoreSemesterLevels();
  }
});

test("hard delete denies non-admins and returns 404 for an admin when the syllabus is absent", async () => {
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalSyllabusDelete = prisma.syllabus.delete;
  let hardDeleteCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    null) as typeof prisma.syllabus.findUnique;
  prisma.syllabus.delete = (async () => {
    hardDeleteCalls += 1;
    return {} as never;
  }) as typeof prisma.syllabus.delete;

  try {
    const nonAdminResponse = replyDouble();
    await deleteSyllabusController(
      {
        user: user(Role.USER),
        params: { id: "syllabus-1" },
        query: { hard: "true" },
      } as never,
      nonAdminResponse.reply as never,
    );
    assert.equal(nonAdminResponse.result().statusCode, 403);

    const adminResponse = replyDouble();
    await deleteSyllabusController(
      {
        user: user(Role.ADMIN),
        params: { id: "syllabus-missing" },
        query: { hard: "true" },
      } as never,
      adminResponse.reply as never,
    );
    assert.equal(adminResponse.result().statusCode, 404);
    assert.equal(hardDeleteCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabus.delete = originalSyllabusDelete;
  }
});

test("cross-syllabus reorder cannot reach the reorder transaction when scope authorization fails", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalTopicFindMany = prisma.syllabusTopic.findMany;
  const originalAssignmentsFindMany = prisma.userRoleAssignments.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.syllabusTopic.findMany = (async () => [
    { id: "topic-1", syllabus: scope },
    { id: "topic-2", syllabus: scope },
  ]) as typeof prisma.syllabusTopic.findMany;
  prisma.userRoleAssignments.findMany = (async () => [
    wrongScopeAssignment,
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    const response = replyDouble();
    await reorderTopicsController(
      {
        user: user(Role.USER),
        body: {
          topics: [
            { id: "topic-1", orderIndex: 0 },
            { id: "topic-2", orderIndex: 1 },
          ],
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 403);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabusTopic.findMany = originalTopicFindMany;
    prisma.userRoleAssignments.findMany = originalAssignmentsFindMany;
    prisma.$transaction = originalTransaction;
    restoreSemesterLevels();
  }
});

test("null and unsupported topic linkage bodies return 400 before any scope lookup", async () => {
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  let lookupCalls = 0;

  prisma.syllabus.findUnique = (async () => {
    lookupCalls += 1;
    return scope;
  }) as typeof prisma.syllabus.findUnique;

  try {
    for (const body of [null, { syllabusId: "syllabus-1", parentId: null }]) {
      const response = replyDouble();
      await createTopicController(
        { user: user(Role.ADMIN), body } as never,
        response.reply as never,
      );
      assert.equal(response.result().statusCode, 400);
    }
    assert.equal(lookupCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
  }
});

test("mixed update payloads reject linkage fields before scope lookups", async () => {
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  let scopeLookupCalls = 0;

  prisma.syllabus.findUnique = (async () => {
    scopeLookupCalls += 1;
    return scope;
  }) as typeof prisma.syllabus.findUnique;
  prisma.syllabusTopic.findUnique = (async () => {
    scopeLookupCalls += 1;
    return { syllabus: scope } as never;
  }) as typeof prisma.syllabusTopic.findUnique;

  try {
    const syllabusResponse = replyDouble();
    await updateSyllabusController(
      {
        user: user(Role.ADMIN),
        params: { id: "syllabus-1" },
        body: { name: "Updated", projectId: "project-other" },
      } as never,
      syllabusResponse.reply as never,
    );
    assert.equal(syllabusResponse.result().statusCode, 400);

    const topicResponse = replyDouble();
    await updateTopicController(
      {
        user: user(Role.ADMIN),
        params: { id: "topic-1" },
        body: { title: "Updated", syllabusId: "syllabus-other" },
      } as never,
      topicResponse.reply as never,
    );
    assert.equal(topicResponse.result().statusCode, 400);
    assert.equal(scopeLookupCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
  }
});

test("invalid progress log dates return 400 before the log service query", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  let logQueryCalls = 0;

  prisma.syllabusProgressLog.findMany = (async () => {
    logQueryCalls += 1;
    return [];
  }) as typeof prisma.syllabusProgressLog.findMany;

  try {
    const response = replyDouble();
    await getProgressLogsController(
      {
        user: user(Role.ADMIN),
        query: { startDate: "2026-02-30" },
      } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 400);
    assert.deepEqual(response.result().payload, {
      error: "startDate must be in YYYY-MM-DD format",
    });
    assert.equal(logQueryCalls, 0);
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});

test("non-admin global syllabus list is denied before the list service query", async () => {
  const originalSyllabusFindMany = prisma.syllabus.findMany;
  let listCalls = 0;

  prisma.syllabus.findMany = (async () => {
    listCalls += 1;
    return [];
  }) as typeof prisma.syllabus.findMany;

  try {
    const response = replyDouble();
    await getSyllabiController(
      { user: user(Role.USER), query: {} } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 403);
    assert.equal(listCalls, 0);
  } finally {
    prisma.syllabus.findMany = originalSyllabusFindMany;
  }
});

test("topic-scoped statistics resolve the topic syllabus before querying statistics", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  const originalAssignmentsFindMany = prisma.userRoleAssignments.findMany;
  const originalSyllabusFindMany = prisma.syllabus.findMany;
  let statisticsQuery: unknown;

  prisma.syllabusTopic.findUnique = (async (args: {
    select: Record<string, unknown>;
  }) =>
    "syllabusId" in args.select
      ? { syllabusId: "syllabus-1" }
      : { syllabus: scope }) as typeof prisma.syllabusTopic.findUnique;
  prisma.userRoleAssignments.findMany = (async () => [
    { ...wrongScopeAssignment, projectId: scope.projectId },
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.syllabus.findMany = (async (args: unknown) => {
    statisticsQuery = args;
    return [];
  }) as typeof prisma.syllabus.findMany;

  try {
    const response = replyDouble();
    await getStatisticsController(
      { user: user(Role.USER), query: { topicId: "topic-1" } } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 200);
    assert.deepEqual((statisticsQuery as { where: unknown }).where, {
      id: "syllabus-1",
      isActive: true,
    });
  } finally {
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
    prisma.userRoleAssignments.findMany = originalAssignmentsFindMany;
    prisma.syllabus.findMany = originalSyllabusFindMany;
    restoreSemesterLevels();
  }
});

test("topic-scoped statistics return 404 for an absent topic before a global query", async () => {
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  const originalSyllabusFindMany = prisma.syllabus.findMany;
  let statisticsCalls = 0;

  prisma.syllabusTopic.findUnique = (async () =>
    null) as typeof prisma.syllabusTopic.findUnique;
  prisma.syllabus.findMany = (async () => {
    statisticsCalls += 1;
    return [];
  }) as typeof prisma.syllabus.findMany;

  try {
    const response = replyDouble();
    await getStatisticsController(
      { user: user(Role.ADMIN), query: { topicId: "topic-missing" } } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 404);
    assert.equal(statisticsCalls, 0);
  } finally {
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
    prisma.syllabus.findMany = originalSyllabusFindMany;
  }
});

test("a curriculum mentor with a null assignment level reaches template import", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalAssignmentsFindMany = prisma.userRoleAssignments.findMany;

  prisma.userRoleAssignments.findMany = (async () => [
    {
      subRole: SubRole.CURRICULUM_MENTOR,
      projectId: scope.projectId,
      centerId: scope.centerId,
      semesterId: scope.semesterId,
      semesterLevelId: null,
      level: null,
      isActive: true,
    },
  ]) as typeof prisma.userRoleAssignments.findMany;

  try {
    const response = replyDouble();
    await importTemplateController(
      {
        user: user(Role.USER),
        body: { ...scope, templateName: "LEVEL_1" },
      } as never,
      response.reply as never,
    );

    assert.equal(response.result().statusCode, 501);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignmentsFindMany;
    restoreSemesterLevels();
  }
});

test("non-admin progress logs require an ID-backed scope before the log service", async () => {
  const source = await readFile(
    new URL("../../controllers/syllabus.controller.ts", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("export const getProgressLogsController");
  const end = source.indexOf("\nexport const ", start + 1);
  const block = source.slice(start, end === -1 ? undefined : end);

  assert.ok(block.indexOf("filters.syllabusId") >= 0);
  assert.ok(
    block.indexOf("getProgressLogs(filters)") >
      block.indexOf("filters.syllabusId"),
  );
});

test("ID mutations resolve persisted scope before authorization and the service call", async () => {
  const source = await readFile(
    new URL("../../controllers/syllabus.controller.ts", import.meta.url),
    "utf8",
  );

  for (const [name, scopeLookup, serviceCall] of [
    [
      "getSyllabusByIdController",
      "getSyllabusScope(id)",
      "getSyllabusById(id,",
    ],
    ["updateSyllabusController", "getSyllabusScope(id)", "updateSyllabus(id,"],
    ["deleteSyllabusController", "getSyllabusScope(id)", "deleteSyllabus(id)"],
    ["getTopicByIdController", "getTopicScope(id)", "getTopicById(id,"],
    ["updateTopicController", "getTopicScope(id)", "updateTopic(id,"],
    [
      "updateTopicStatusController",
      "getTopicScope(id)",
      "updateTopicStatus(id,",
    ],
    ["deleteTopicController", "getTopicScope(id)", "deleteTopic(id)"],
  ] as const) {
    const start = source.indexOf(`export const ${name}`);
    const end = source.indexOf("\nexport const ", start + 1);
    const block = source.slice(start, end === -1 ? undefined : end);
    assert.ok(block.indexOf(scopeLookup) >= 0, `${name} loads persisted scope`);
    assert.ok(
      block.indexOf(serviceCall) > block.indexOf(scopeLookup),
      `${name} calls the ID service after scope lookup`,
    );
  }
});
