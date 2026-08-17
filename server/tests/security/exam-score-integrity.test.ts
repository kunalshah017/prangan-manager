import assert from "node:assert/strict";
import test from "node:test";

import { ACADEMIC_LEVEL_CODES } from "../helpers/academic-level-codes.js";
import { prisma } from "../../lib/prisma.js";
import { buildScoreComponents } from "../../security/exam-score-input.js";
import {
  bulkCreateScores,
  createExam,
  createStudentScore,
  getExams,
  updateStudentScore,
} from "../../service/exam.service.js";

const exam = {
  id: "exam-1",
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  listeningMaxMarks: 10,
  speakingMaxMarks: 10,
  readingMaxMarks: 10,
  writingMaxMarks: 10,
  totalMaxMarks: 40,
  isActive: true,
} as never;

const enrollment = {
  id: "enrollment-1",
  studentId: "student-1",
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  isActive: true,
} as never;

const scoreInput = {
  examId: "exam-1",
  studentId: "student-1",
  enrollmentId: "enrollment-1",
  listeningScore: 8,
  speakingScore: 7,
  readingScore: 6,
  writingScore: 5,
} as const;

const createdScore = {
  id: "score-1",
  ...scoreInput,
  totalScore: 26,
  isAbsent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as never;

test("score components reject non-boolean absence values", () => {
  for (const isAbsent of ["false", 1, {}, null]) {
    assert.throws(
      () => buildScoreComponents(scoreInput, exam, isAbsent),
      /isAbsent must be a boolean/,
    );
  }
});

test("score components reject non-number values", () => {
  for (const listeningScore of ["8", null, {}]) {
    assert.throws(
      () => buildScoreComponents({ ...scoreInput, listeningScore }, exam),
      /must be a nonnegative finite number/,
    );
  }
});

test("single score creation rejects inactive exams before enrollment lookup or creation", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;
  let enrollmentLookups = 0;
  let createCalls = 0;

  prisma.exam.findUnique = (async () => ({
    ...exam,
    isActive: false,
  })) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findFirst = (async () => {
    enrollmentLookups += 1;
    return enrollment;
  }) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async () => {
    createCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.create;

  try {
    await assert.rejects(
      () => createStudentScore(scoreInput, "educator-1"),
      /Exam is not active/,
    );
    assert.equal(enrollmentLookups, 0);
    assert.equal(createCalls, 0);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("bulk score creation rejects inactive exams before enrollment lookup or transaction", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalCreate = prisma.studentExamScore.create;
  const originalTransaction = prisma.$transaction;
  let enrollmentLookups = 0;
  let createCalls = 0;
  let transactionCalls = 0;

  prisma.exam.findUnique = (async () => ({
    ...exam,
    isActive: false,
  })) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findMany = (async () => {
    enrollmentLookups += 1;
    return [enrollment];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.studentExamScore.create = (async () => {
    createCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.create;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        bulkCreateScores(
          { examId: "exam-1", scores: [scoreInput] },
          "educator-1",
        ),
      /Exam is not active/,
    );
    assert.equal(enrollmentLookups, 0);
    assert.equal(createCalls, 0);
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.studentExamScore.create = originalCreate;
    prisma.$transaction = originalTransaction;
  }
});

test("single score creation rejects a student enrollment from another exam context", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;
  let createCalls = 0;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findUnique = (async () => ({
    ...enrollment,
    centerId: "center-2",
  })) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findFirst = (async () =>
    null) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async () => {
    createCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.create;

  try {
    await assert.rejects(
      () => createStudentScore(scoreInput, "educator-1"),
      /Invalid enrollment for student/,
    );
    assert.equal(createCalls, 0);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("single score creation accepts an active exact enrollment", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;
  let createdData: unknown;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findUnique = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findFirst = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async (args: unknown) => {
    createdData = args;
    return createdScore;
  }) as typeof prisma.studentExamScore.create;

  try {
    await createStudentScore(scoreInput, "educator-1");
    const created = (createdData as { data: Record<string, unknown> }).data;
    assert.equal(created.enrollmentId, scoreInput.enrollmentId);
    assert.equal(created.totalScore, 26);
    assert.equal(created.isAbsent, false);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("single score creation rejects invalid numeric components", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findUnique = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findFirst = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async () =>
    createdScore) as typeof prisma.studentExamScore.create;

  try {
    for (const listeningScore of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(
        () =>
          createStudentScore({ ...scoreInput, listeningScore }, "educator-1"),
        /must be a nonnegative finite number/,
      );
    }
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("single score creation rejects components over their maximum", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findUnique = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findFirst = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async () =>
    createdScore) as typeof prisma.studentExamScore.create;

  try {
    await assert.rejects(
      () =>
        createStudentScore({ ...scoreInput, writingScore: 11 }, "educator-1"),
      /exceeds maximum marks/,
    );
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("single score creation normalizes absent components and total to zero", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindUnique = prisma.studentEnrollments.findUnique;
  const originalEnrollmentFindFirst = prisma.studentEnrollments.findFirst;
  const originalCreate = prisma.studentExamScore.create;
  let createdData: unknown;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findUnique = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findUnique;
  prisma.studentEnrollments.findFirst = (async () =>
    enrollment) as typeof prisma.studentEnrollments.findFirst;
  prisma.studentExamScore.create = (async (args: unknown) => {
    createdData = args;
    return { ...createdScore, totalScore: 0, isAbsent: true } as never;
  }) as typeof prisma.studentExamScore.create;

  try {
    await createStudentScore(
      { ...scoreInput, listeningScore: -1, isAbsent: true },
      "educator-1",
    );
    const created = (createdData as { data: Record<string, unknown> }).data;
    assert.equal(created.listeningScore, 0);
    assert.equal(created.speakingScore, 0);
    assert.equal(created.readingScore, 0);
    assert.equal(created.writingScore, 0);
    assert.equal(created.totalScore, 0);
    assert.equal(created.isAbsent, true);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findUnique = originalEnrollmentFindUnique;
    prisma.studentEnrollments.findFirst = originalEnrollmentFindFirst;
    prisma.studentExamScore.create = originalCreate;
  }
});

test("bulk score creation preflights exact active enrollment pairs before its transaction", async () => {
  const originalExamFindUnique = prisma.exam.findUnique;
  const originalEnrollmentFindMany = prisma.studentEnrollments.findMany;
  const originalTransaction = prisma.$transaction;
  let enrollmentQuery: unknown;
  let transactionCalls = 0;

  prisma.exam.findUnique = (async () => exam) as typeof prisma.exam.findUnique;
  prisma.studentEnrollments.findMany = (async (args: unknown) => {
    enrollmentQuery = args;
    return [enrollment];
  }) as typeof prisma.studentEnrollments.findMany;
  prisma.$transaction = (async () => {
    transactionCalls += 1;
    return [];
  }) as typeof prisma.$transaction;

  try {
    await assert.rejects(
      () =>
        bulkCreateScores(
          {
            examId: "exam-1",
            scores: [
              { ...scoreInput, enrollmentId: "enrollment-1" },
              {
                ...scoreInput,
                studentId: "student-2",
                enrollmentId: "enrollment-2",
              },
            ],
          },
          "educator-1",
        ),
      /Invalid enrollment for student/,
    );

    assert.deepEqual(
      (enrollmentQuery as { where: Record<string, unknown> }).where,
      {
        OR: [
          { id: "enrollment-1", studentId: "student-1" },
          { id: "enrollment-2", studentId: "student-2" },
        ],
        isActive: true,
        projectId: "project-1",
        centerId: "center-1",
        semesterId: "semester-1",
        semesterLevelId: "semester-1-level-1",
      },
    );
    assert.equal(transactionCalls, 0);
  } finally {
    prisma.exam.findUnique = originalExamFindUnique;
    prisma.studentEnrollments.findMany = originalEnrollmentFindMany;
    prisma.$transaction = originalTransaction;
  }
});

test("createExam validates and writes only a managed semester level ID", async () => {
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  const originalExamFindFirst = prisma.exam.findFirst;
  const originalCreate = prisma.exam.create;
  let createArgs: unknown;

  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-1-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;
  prisma.exam.findFirst = (async () => null) as typeof prisma.exam.findFirst;
  prisma.exam.create = (async (args: unknown) => {
    createArgs = args;
    return { id: "exam-1", ...(args as any).data };
  }) as typeof prisma.exam.create;

  try {
    await createExam({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-1-level-1",
      cycle: "SA_1",
      name: "Exam",
      examDate: "2026-07-25",
      listeningMaxMarks: 10,
      speakingMaxMarks: 10,
      readingMaxMarks: 10,
      writingMaxMarks: 10,
    });
    assert.equal(
      (createArgs as any).data.semesterLevelId,
      "semester-1-level-1",
    );
    assert.equal("level" in (createArgs as any).data, false);
    assert.deepEqual((createArgs as any).include.semesterLevel, {
      include: { academicLevel: true },
    });
  } finally {
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
    prisma.exam.findFirst = originalExamFindFirst;
    prisma.exam.create = originalCreate;
  }
});

test("getExams filters by cycle when one is supplied", async () => {
  const originalFindMany = prisma.exam.findMany;
  let query: unknown;

  prisma.exam.findMany = (async (args: unknown) => {
    query = args;
    return [];
  }) as typeof prisma.exam.findMany;

  try {
    await getExams({ cycle: "SA_2" });
    assert.equal((query as { where: { cycle?: string } }).where.cycle, "SA_2");
  } finally {
    prisma.exam.findMany = originalFindMany;
  }
});

test("score updates use the component validator", async () => {
  const originalFindUnique = prisma.studentExamScore.findUnique;
  const originalUpdate = prisma.studentExamScore.update;
  let updateCalls = 0;

  prisma.studentExamScore.findUnique = (async () => ({
    ...createdScore,
    exam,
  })) as typeof prisma.studentExamScore.findUnique;
  prisma.studentExamScore.update = (async () => {
    updateCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.update;

  try {
    await assert.rejects(
      () =>
        updateStudentScore(
          "score-1",
          { readingScore: Number.NaN },
          "educator-1",
        ),
      /must be a nonnegative finite number/,
    );
    assert.equal(updateCalls, 0);
  } finally {
    prisma.studentExamScore.findUnique = originalFindUnique;
    prisma.studentExamScore.update = originalUpdate;
  }
});

test("score updates reject inactive exams before component validation or update", async () => {
  const originalFindUnique = prisma.studentExamScore.findUnique;
  const originalUpdate = prisma.studentExamScore.update;
  let updateCalls = 0;

  prisma.studentExamScore.findUnique = (async () => ({
    ...createdScore,
    exam: { ...exam, isActive: false },
  })) as typeof prisma.studentExamScore.findUnique;
  prisma.studentExamScore.update = (async () => {
    updateCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.update;

  try {
    await assert.rejects(
      () => updateStudentScore("score-1", { readingScore: 8 }, "educator-1"),
      /Exam is not active/,
    );
    assert.equal(updateCalls, 0);
  } finally {
    prisma.studentExamScore.findUnique = originalFindUnique;
    prisma.studentExamScore.update = originalUpdate;
  }
});

test("score updates reject a raw non-boolean absence value", async () => {
  const originalFindUnique = prisma.studentExamScore.findUnique;
  const originalUpdate = prisma.studentExamScore.update;
  let updateCalls = 0;

  prisma.studentExamScore.findUnique = (async () => ({
    ...createdScore,
    exam,
  })) as typeof prisma.studentExamScore.findUnique;
  prisma.studentExamScore.update = (async () => {
    updateCalls += 1;
    return createdScore;
  }) as typeof prisma.studentExamScore.update;

  try {
    await assert.rejects(
      () =>
        updateStudentScore(
          "score-1",
          { isAbsent: "false" } as never,
          "educator-1",
        ),
      /isAbsent must be a boolean/,
    );
    assert.equal(updateCalls, 0);
  } finally {
    prisma.studentExamScore.findUnique = originalFindUnique;
    prisma.studentExamScore.update = originalUpdate;
  }
});
