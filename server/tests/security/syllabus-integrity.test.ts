import assert from "node:assert/strict";
import test from "node:test";

import { Level } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import {
  bulkCreateTopics,
  createSyllabus,
  createSyllabusTopic,
  getProgressLogs,
  getSyllabusScope,
  getReorderSyllabusScope,
  getTopicScope,
  getTopics,
  reorderTopics,
} from "../../service/syllabus.service.js";

const syllabusScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  level: Level.LEVEL_1,
};

const mockSemesterLevel = () => {
  const originalFindFirst = prisma.semesterLevel.findFirst;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  return () => {
    prisma.semesterLevel.findFirst = originalFindFirst;
  };
};

test("getSyllabusScope selects only the syllabus authorization context", async () => {
  const restoreSemesterLevel = mockSemesterLevel();
  const originalFindUnique = prisma.syllabus.findUnique;
  let query: unknown;

  prisma.syllabus.findUnique = (async (args: unknown) => {
    query = args;
    return syllabusScope;
  }) as typeof prisma.syllabus.findUnique;

  try {
    assert.deepEqual(await getSyllabusScope("syllabus-1"), syllabusScope);
    assert.deepEqual(query, {
      where: { id: "syllabus-1" },
      select: {
        projectId: true,
        centerId: true,
        semesterId: true,
        semesterLevelId: true,
        level: true,
      },
    });
  } finally {
    prisma.syllabus.findUnique = originalFindUnique;
    restoreSemesterLevel();
  }
});

test("getTopicScope selects the authorization context through its syllabus", async () => {
  const restoreSemesterLevel = mockSemesterLevel();
  const originalFindUnique = prisma.syllabusTopic.findUnique;
  let query: unknown;

  prisma.syllabusTopic.findUnique = (async (args: unknown) => {
    query = args;
    return { syllabus: syllabusScope };
  }) as typeof prisma.syllabusTopic.findUnique;

  try {
    assert.deepEqual(await getTopicScope("topic-1"), syllabusScope);
    assert.deepEqual(query, {
      where: { id: "topic-1" },
      select: {
        syllabus: {
          select: {
            projectId: true,
            centerId: true,
            semesterId: true,
            semesterLevelId: true,
            level: true,
          },
        },
      },
    });
  } finally {
    prisma.syllabusTopic.findUnique = originalFindUnique;
    restoreSemesterLevel();
  }
});

test("createSyllabus validates a semester level ID and dual-writes its legacy code", async () => {
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalSyllabusFindFirst = prisma.syllabus.findFirst;
  const originalCreate = prisma.syllabus.create;
  let createArgs: unknown;

  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: Level.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.syllabus.findFirst = (async () =>
    null) as typeof prisma.syllabus.findFirst;
  prisma.syllabus.create = (async (args: unknown) => {
    createArgs = args;
    return { id: "syllabus-1", ...(args as any).data };
  }) as typeof prisma.syllabus.create;

  try {
    await createSyllabus({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      name: "Syllabus",
    });
    assert.equal(
      (createArgs as any).data.semesterLevelId,
      "semester-1-level-1",
    );
    assert.equal((createArgs as any).data.level, Level.LEVEL_1);
    assert.deepEqual((createArgs as any).include.semesterLevel, {
      include: { academicLevel: true },
    });
  } finally {
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.syllabus.findFirst = originalSyllabusFindFirst;
    prisma.syllabus.create = originalCreate;
  }
});

test("getReorderSyllabusScope rejects different syllabi with matching contexts", async () => {
  const originalFindMany = prisma.syllabusTopic.findMany;

  prisma.syllabusTopic.findMany = (async () => [
    { id: "topic-1", syllabusId: "syllabus-1", syllabus: syllabusScope },
    { id: "topic-2", syllabusId: "syllabus-2", syllabus: syllabusScope },
  ]) as typeof prisma.syllabusTopic.findMany;

  try {
    assert.equal(await getReorderSyllabusScope(["topic-1", "topic-2"]), null);
  } finally {
    prisma.syllabusTopic.findMany = originalFindMany;
  }
});

test("createSyllabusTopic rejects a parent from another syllabus before creation", async () => {
  const restoreSemesterLevel = mockSemesterLevel();
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  const originalCreate = prisma.syllabusTopic.create;
  let createCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    syllabusScope) as typeof prisma.syllabus.findUnique;
  prisma.syllabusTopic.findUnique = (async () => ({
    id: "parent-1",
    syllabusId: "syllabus-2",
  })) as typeof prisma.syllabusTopic.findUnique;
  prisma.syllabusTopic.create = (async () => {
    createCalls += 1;
    return {} as never;
  }) as typeof prisma.syllabusTopic.create;

  try {
    await assert.rejects(
      () =>
        createSyllabusTopic({
          syllabusId: "syllabus-1",
          parentId: "parent-1",
          serialNumber: "1.1",
          title: "Subtopic",
          orderIndex: 1,
        }),
      /Parent topic must belong to the same syllabus/,
    );
    assert.equal(createCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
    prisma.syllabusTopic.create = originalCreate;
    restoreSemesterLevel();
  }
});

test("createSyllabusTopic rejects a missing syllabus before looking up a parent or creating", async () => {
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalTopicFindUnique = prisma.syllabusTopic.findUnique;
  const originalCreate = prisma.syllabusTopic.create;
  let parentLookupCalls = 0;
  let createCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    null) as typeof prisma.syllabus.findUnique;
  prisma.syllabusTopic.findUnique = (async () => {
    parentLookupCalls += 1;
    return {} as never;
  }) as typeof prisma.syllabusTopic.findUnique;
  prisma.syllabusTopic.create = (async () => {
    createCalls += 1;
    return {} as never;
  }) as typeof prisma.syllabusTopic.create;

  try {
    await assert.rejects(
      () =>
        createSyllabusTopic({
          syllabusId: "syllabus-missing",
          parentId: "parent-1",
          serialNumber: "1.1",
          title: "Subtopic",
          orderIndex: 1,
        }),
      /Syllabus not found/,
    );
    assert.equal(parentLookupCalls, 0);
    assert.equal(createCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabusTopic.findUnique = originalTopicFindUnique;
    prisma.syllabusTopic.create = originalCreate;
  }
});

test("bulkCreateTopics rejects a parent from another syllabus before its transaction", async () => {
  const restoreSemesterLevel = mockSemesterLevel();
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalTopicFindMany = prisma.syllabusTopic.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    syllabusScope) as typeof prisma.syllabus.findUnique;
  prisma.syllabusTopic.findMany = (async () => [
    { id: "parent-1", syllabusId: "syllabus-2" },
  ]) as typeof prisma.syllabusTopic.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        bulkCreateTopics({
          syllabusId: "syllabus-1",
          topics: [
            {
              parentId: "parent-1",
              serialNumber: "1.1",
              title: "Subtopic",
              orderIndex: 1,
            },
          ],
        }),
      /Parent topic must belong to the same syllabus/,
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabusTopic.findMany = originalTopicFindMany;
    prisma.$transaction = originalTransaction;
    restoreSemesterLevel();
  }
});

test("bulkCreateTopics rejects a missing syllabus before looking up topics or starting its transaction", async () => {
  const originalSyllabusFindUnique = prisma.syllabus.findUnique;
  const originalTopicFindMany = prisma.syllabusTopic.findMany;
  const originalTransaction = prisma.$transaction;
  let findManyCalls = 0;
  let transactionCalls = 0;

  prisma.syllabus.findUnique = (async () =>
    null) as typeof prisma.syllabus.findUnique;
  prisma.syllabusTopic.findMany = (async () => {
    findManyCalls += 1;
    return [];
  }) as typeof prisma.syllabusTopic.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        bulkCreateTopics({
          syllabusId: "syllabus-missing",
          topics: [
            {
              parentId: "parent-1",
              serialNumber: "1.1",
              title: "Subtopic",
              orderIndex: 1,
            },
          ],
        }),
      /Syllabus not found/,
    );
    assert.equal(findManyCalls, 0);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabus.findUnique = originalSyllabusFindUnique;
    prisma.syllabusTopic.findMany = originalTopicFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("reorderTopics rejects topics from different syllabi before its transaction", async () => {
  const originalFindMany = prisma.syllabusTopic.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.syllabusTopic.findMany = (async () => [
    { id: "topic-1", syllabusId: "syllabus-1" },
    { id: "topic-2", syllabusId: "syllabus-2" },
  ]) as typeof prisma.syllabusTopic.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        reorderTopics({
          topics: [
            { id: "topic-1", orderIndex: 1 },
            { id: "topic-2", orderIndex: 2 },
          ],
        }),
      /Topics must belong to one syllabus/,
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabusTopic.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("reorderTopics rejects a request containing a missing topic before its transaction", async () => {
  const originalFindMany = prisma.syllabusTopic.findMany;
  const originalTransaction = prisma.$transaction;
  let transactionCalls = 0;

  prisma.syllabusTopic.findMany = (async () => [
    { id: "topic-1", syllabusId: "syllabus-1" },
  ]) as typeof prisma.syllabusTopic.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        reorderTopics({
          topics: [
            { id: "topic-1", orderIndex: 1 },
            { id: "topic-missing", orderIndex: 2 },
          ],
        }),
      /Topics must belong to one syllabus/,
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabusTopic.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("reorderTopics rejects duplicate IDs before its transaction", async () => {
  const originalFindMany = prisma.syllabusTopic.findMany;
  const originalTransaction = prisma.$transaction;
  let findManyCalls = 0;
  let transactionCalls = 0;

  prisma.syllabusTopic.findMany = (async () => {
    findManyCalls += 1;
    return [];
  }) as typeof prisma.syllabusTopic.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        reorderTopics({
          topics: [
            { id: "topic-1", orderIndex: 1 },
            { id: "topic-1", orderIndex: 2 },
          ],
        }),
      /Topics must belong to one syllabus/,
    );
    assert.equal(findManyCalls, 0);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.syllabusTopic.findMany = originalFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("getTopics translates an empty parentId to a root-topic filter", async () => {
  const originalFindMany = prisma.syllabusTopic.findMany;
  let query: unknown;

  prisma.syllabusTopic.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.syllabusTopic.findMany;

  try {
    await getTopics({ syllabusId: "syllabus-1", parentId: "" });
    assert.equal(
      (query as { where: { parentId?: string | null } }).where.parentId,
      null,
    );
  } finally {
    prisma.syllabusTopic.findMany = originalFindMany;
  }
});

test("getProgressLogs applies a start date without requiring an end date", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  let query: unknown;

  prisma.syllabusProgressLog.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.syllabusProgressLog.findMany;

  try {
    await getProgressLogs({ startDate: "2026-07-01T00:00:00.000Z" });
    assert.deepEqual(
      (query as { where: { createdAt?: { gte?: Date; lte?: Date } } }).where
        .createdAt,
      { gte: new Date("2026-07-01T00:00:00.000Z") },
    );
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});

test("getProgressLogs expands a date-only start date to the beginning of its UTC day", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  let query: unknown;

  prisma.syllabusProgressLog.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.syllabusProgressLog.findMany;

  try {
    await getProgressLogs({ startDate: "2026-07-01" });
    assert.deepEqual(
      (query as { where: { createdAt?: { gte?: Date; lte?: Date } } }).where
        .createdAt,
      { gte: new Date("2026-07-01T00:00:00.000Z") },
    );
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});

test("getProgressLogs applies an end date without requiring a start date", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  let query: unknown;

  prisma.syllabusProgressLog.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.syllabusProgressLog.findMany;

  try {
    await getProgressLogs({ endDate: "2026-07-31T23:59:59.999Z" });
    assert.deepEqual(
      (query as { where: { createdAt?: { gte?: Date; lte?: Date } } }).where
        .createdAt,
      { lte: new Date("2026-07-31T23:59:59.999Z") },
    );
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});

test("getProgressLogs expands a date-only end date through the end of its UTC day", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  let query: unknown;

  prisma.syllabusProgressLog.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.syllabusProgressLog.findMany;

  try {
    await getProgressLogs({ endDate: "2026-07-31" });
    assert.deepEqual(
      (query as { where: { createdAt?: { gte?: Date; lte?: Date } } }).where
        .createdAt,
      { lte: new Date("2026-07-31T23:59:59.999Z") },
    );
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});

test("getProgressLogs returns the user relation as updatedByUser", async () => {
  const originalFindMany = prisma.syllabusProgressLog.findMany;
  const log = {
    id: "log-1",
    topicId: "topic-1",
    previousStatus: "PENDING",
    newStatus: "COMPLETED",
    updatedBy: "user-1",
    notes: "Finished",
    createdAt: new Date("2026-07-18T00:00:00.000Z"),
    topic: {
      id: "topic-1",
      title: "Topic",
      serialNumber: "1",
      syllabusId: "syllabus-1",
    },
    user: {
      id: "user-1",
      name: "Educator",
      email: "educator@example.com",
      profileImageUrl: "https://example.com/profile.png",
    },
  };

  prisma.syllabusProgressLog.findMany = (async () => [
    log,
  ]) as typeof prisma.syllabusProgressLog.findMany;

  try {
    const [result] = await getProgressLogs({ topicId: "topic-1" });
    const { user, ...expectedLog } = log;

    assert.deepEqual(result, {
      ...expectedLog,
      updatedByUser: user,
    });
    assert.equal("user" in result, false);
  } finally {
    prisma.syllabusProgressLog.findMany = originalFindMany;
  }
});
