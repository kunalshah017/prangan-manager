import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createStudentScoreController,
  bulkCreateScoresController,
  deleteExamController,
  deleteStudentScoreController,
  getStudentScoresController,
  updateStudentScoreController,
} from "../../controllers/exam.controller.js";
import { Level, Role, SubRole } from "../../generated/prisma/index.js";
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

const educator = {
  id: "educator-1",
  name: "Educator",
  email: "educator@example.com",
  role: Role.USER,
};

const wrongAssignment = {
  subRole: SubRole.EDUCATOR,
  projectId: "project-2",
  centerId: "center-2",
  semesterId: "semester-2",
  semesterLevelId: "semester-2-level-2",
  level: Level.LEVEL_2,
  isActive: true,
};

const examScope = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  level: Level.LEVEL_1,
};

const mockSemesterLevels = () => {
  const originalFindFirst = prisma.semesterLevel.findFirst;
  prisma.semesterLevel.findFirst = (async ({ where }: any) => ({
    id: where.id,
    academicLevel: {
      code: where.id?.includes("level-2") ? Level.LEVEL_2 : Level.LEVEL_1,
    },
  })) as typeof prisma.semesterLevel.findFirst;
  return () => {
    prisma.semesterLevel.findFirst = originalFindFirst;
  };
};

test("exam controllers do not expose caught error details in public responses", async () => {
  const controllerSource = await readFile(
    new URL("../../controllers/exam.controller.ts", import.meta.url),
    "utf8",
  );

  assert.equal(controllerSource.includes("details: error.message"), false);
  assert.equal(controllerSource.includes("error: error.message"), false);
});

test("a non-admin cannot create a score for an exam outside their active scope", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalExamLookup = prisma.exam.findUnique;
  const originalCreate = prisma.studentExamScore.create;
  let scoreCreates = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    wrongAssignment,
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.exam.findUnique = (async () =>
    examScope) as typeof prisma.exam.findUnique;
  prisma.studentExamScore.create = (async () => {
    scoreCreates += 1;
    return {};
  }) as typeof prisma.studentExamScore.create;

  try {
    const response = createReply();
    await createStudentScoreController(
      {
        user: educator,
        body: {
          examId: "exam-1",
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          listeningScore: 1,
          speakingScore: 1,
          readingScore: 1,
          writingScore: 1,
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.payload, { error: "Forbidden" });
    assert.equal(scoreCreates, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.exam.findUnique = originalExamLookup;
    prisma.studentExamScore.create = originalCreate;
    restoreSemesterLevels();
  }
});

test("a non-admin cannot list scores for an exam outside their active scope", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalAssignments = prisma.userRoleAssignments.findMany;
  const originalExamLookup = prisma.exam.findUnique;
  const originalList = prisma.studentExamScore.findMany;
  let scoreLists = 0;

  prisma.userRoleAssignments.findMany = (async () => [
    wrongAssignment,
  ]) as typeof prisma.userRoleAssignments.findMany;
  prisma.exam.findUnique = (async () =>
    examScope) as typeof prisma.exam.findUnique;
  prisma.studentExamScore.findMany = (async () => {
    scoreLists += 1;
    return [];
  }) as typeof prisma.studentExamScore.findMany;

  try {
    const response = createReply();
    await getStudentScoresController(
      { user: educator, query: { examId: "exam-1" } } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.payload, { error: "Forbidden" });
    assert.equal(scoreLists, 0);
  } finally {
    prisma.userRoleAssignments.findMany = originalAssignments;
    prisma.exam.findUnique = originalExamLookup;
    prisma.studentExamScore.findMany = originalList;
    restoreSemesterLevels();
  }
});

test("an admin can list scores without an exam scope", async () => {
  const originalList = prisma.studentExamScore.findMany;
  let scoreLists = 0;

  prisma.studentExamScore.findMany = (async () => {
    scoreLists += 1;
    return [];
  }) as typeof prisma.studentExamScore.findMany;

  try {
    const response = createReply();
    await getStudentScoresController(
      {
        user: { ...educator, role: Role.ADMIN },
        query: { studentId: "student-1" },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(scoreLists, 1);
  } finally {
    prisma.studentExamScore.findMany = originalList;
  }
});

test("score controllers reject null and linkage request bodies before scope or score services", async () => {
  const originalExamLookup = prisma.exam.findUnique;
  const originalScoreLookup = prisma.studentExamScore.findUnique;
  let examLookups = 0;
  let scoreLookups = 0;

  prisma.exam.findUnique = (async () => {
    examLookups += 1;
    return examScope;
  }) as typeof prisma.exam.findUnique;
  prisma.studentExamScore.findUnique = (async () => {
    scoreLookups += 1;
    return { exam: examScope };
  }) as typeof prisma.studentExamScore.findUnique;

  try {
    for (const [controller, request] of [
      [createStudentScoreController, { user: educator, body: null }],
      [
        createStudentScoreController,
        {
          user: educator,
          body: {
            examId: " exam-1 ",
            studentId: "student-1",
            enrollmentId: "enrollment-1",
            listeningScore: 1,
            speakingScore: 1,
            readingScore: 1,
            writingScore: 1,
          },
        },
      ],
      [bulkCreateScoresController, { user: educator, body: null }],
      [
        bulkCreateScoresController,
        {
          user: educator,
          body: {
            examId: "exam-1",
            scores: [
              {
                studentId: "student-1",
                enrollmentId: " enrollment-1 ",
                listeningScore: 1,
                speakingScore: 1,
                readingScore: 1,
                writingScore: 1,
              },
            ],
          },
        },
      ],
      [
        updateStudentScoreController,
        { user: educator, params: { id: "score-1" }, body: null },
      ],
      [
        updateStudentScoreController,
        {
          user: educator,
          params: { id: "score-1" },
          body: { examId: "exam-1" },
        },
      ],
    ] as const) {
      const response = createReply();
      await controller(request as never, response.reply as never);
      assert.equal(response.statusCode, 400);
    }

    assert.equal(examLookups, 0);
    assert.equal(scoreLookups, 0);
  } finally {
    prisma.exam.findUnique = originalExamLookup;
    prisma.studentExamScore.findUnique = originalScoreLookup;
  }
});

test("score component errors return a stable 400 without error details", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalExamLookup = prisma.exam.findUnique;
  const originalEnrollmentLookup = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;
  let scoreCreates = 0;

  prisma.exam.findUnique = (async () => ({
    ...examScope,
    isActive: true,
    listeningMaxMarks: 10,
    speakingMaxMarks: 10,
    readingMaxMarks: 10,
    writingMaxMarks: 10,
    totalMaxMarks: 40,
  })) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findFirst = (async () => ({
    id: "enrollment-1",
    studentId: "student-1",
  })) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async () => {
    scoreCreates += 1;
    return {};
  }) as typeof prisma.studentExamScore.create;

  try {
    const response = createReply();
    await createStudentScoreController(
      {
        user: { ...educator, role: Role.ADMIN },
        body: {
          examId: "exam-1",
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          listeningScore: "1",
          speakingScore: 1,
          readingScore: 1,
          writingScore: 1,
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.payload, {
      error: "Invalid score values",
    });
    assert.equal(scoreCreates, 0);
  } finally {
    prisma.exam.findUnique = originalExamLookup;
    prisma.studentEnrollments.findFirst = originalEnrollmentLookup;
    prisma.studentExamScore.create = originalCreate;
    restoreSemesterLevels();
  }
});

test("bulk invalid enrollment errors keep a 400 without exposing student identifiers", async () => {
  const restoreSemesterLevels = mockSemesterLevels();
  const originalExamLookup = prisma.exam.findUnique;
  const originalEnrollmentLookup = prisma.studentEnrollments.findMany;

  prisma.exam.findUnique = (async () => ({
    ...examScope,
    isActive: true,
    listeningMaxMarks: 10,
    speakingMaxMarks: 10,
    readingMaxMarks: 10,
    writingMaxMarks: 10,
    totalMaxMarks: 40,
  })) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findMany =
    (async () => []) as typeof prisma.studentEnrollments.findMany;

  try {
    const response = createReply();
    await bulkCreateScoresController(
      {
        user: { ...educator, role: Role.ADMIN },
        body: {
          examId: "exam-1",
          scores: [
            {
              studentId: "secret-id",
              enrollmentId: "enrollment-1",
              listeningScore: 1,
              speakingScore: 1,
              readingScore: 1,
              writingScore: 1,
            },
          ],
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.payload, { error: "Invalid score enrollment" });
    assert.equal(JSON.stringify(response.payload).includes("secret-id"), false);
  } finally {
    prisma.exam.findUnique = originalExamLookup;
    prisma.studentEnrollments.findMany = originalEnrollmentLookup;
    restoreSemesterLevels();
  }
});

test("admin deletions require an existing exam or student score scope", async () => {
  const originalExamLookup = prisma.exam.findUnique;
  const originalExamDelete = prisma.exam.delete;
  const originalScoreLookup = prisma.studentExamScore.findUnique;
  const originalScoreDelete = prisma.studentExamScore.delete;
  let examDeletes = 0;
  let scoreDeletes = 0;

  prisma.exam.findUnique = (async () => null) as typeof prisma.exam.findUnique;
  prisma.exam.delete = (async () => {
    examDeletes += 1;
    return {};
  }) as typeof prisma.exam.delete;
  prisma.studentExamScore.findUnique = (async () =>
    null) as typeof prisma.studentExamScore.findUnique;
  prisma.studentExamScore.delete = (async () => {
    scoreDeletes += 1;
    return {};
  }) as typeof prisma.studentExamScore.delete;

  try {
    const admin = { ...educator, role: Role.ADMIN };
    const examResponse = createReply();
    await deleteExamController(
      {
        user: admin,
        params: { id: "exam-1" },
        query: { hard: "true" },
      } as never,
      examResponse.reply as never,
    );
    assert.equal(examResponse.statusCode, 404);
    assert.deepEqual(examResponse.payload, { error: "Exam not found" });

    const scoreResponse = createReply();
    await deleteStudentScoreController(
      { user: admin, params: { id: "score-1" } } as never,
      scoreResponse.reply as never,
    );
    assert.equal(scoreResponse.statusCode, 404);
    assert.deepEqual(scoreResponse.payload, {
      error: "Student score not found",
    });
    assert.equal(examDeletes, 0);
    assert.equal(scoreDeletes, 0);
  } finally {
    prisma.exam.findUnique = originalExamLookup;
    prisma.exam.delete = originalExamDelete;
    prisma.studentExamScore.findUnique = originalScoreLookup;
    prisma.studentExamScore.delete = originalScoreDelete;
  }
});
