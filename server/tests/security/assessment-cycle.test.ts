import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  createExamController,
  getExamsController,
  updateExamController,
} from "../../controllers/exam.controller.js";
import { AssessmentCycle, Role } from "../../generated/prisma/index.js";
import { ACADEMIC_LEVEL_CODES } from "../helpers/academic-level-codes.js";
import { prisma } from "../../lib/prisma.js";
import { createExam } from "../../service/exam.service.js";
import {
  parseCreateExamRequest,
  parseUpdateExamRequest,
} from "../../security/exam-input.js";
import {
  parseBulkCreateTopicsRequest,
  parseCreateTopicRequest,
  parseUpdateTopicRequest,
} from "../../security/syllabus-input.js";

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
  return {
    reply,
    get statusCode() {
      return statusCode;
    },
  };
};

const topic = (cycle?: string) => ({
  syllabusId: "syllabus-1",
  serialNumber: "1",
  title: "Topic",
  orderIndex: 0,
  ...(cycle !== undefined && { cycle }),
});

test("curriculum topic inputs require canonical SA assessment cycles", () => {
  for (const cycle of ["SA_1", "SA_2", "SA_3"]) {
    assert.deepEqual(parseCreateTopicRequest(topic(cycle)), {
      data: topic(cycle),
    });
  }

  for (const cycle of [undefined, "PRE_ASSESSMENT", "SA-1", "SA_4"]) {
    assert.ok("error" in parseCreateTopicRequest(topic(cycle)));
  }

  assert.ok(
    "error" in
      parseBulkCreateTopicsRequest({
        syllabusId: "syllabus-1",
        topics: [topic("SA_1"), topic("PRE_ASSESSMENT")],
      }),
  );
  assert.deepEqual(parseUpdateTopicRequest({ title: "Renamed" }), {
    data: { title: "Renamed" },
  });
  assert.ok("error" in parseUpdateTopicRequest({ cycle: "PRE_ASSESSMENT" }));
  assert.deepEqual(parseUpdateTopicRequest({ cycle: "SA_2" }), {
    data: { cycle: "SA_2" },
  });
});

test("exam controllers retain all four cycles and reject unknown cycles before persistence", async () => {
  assert.deepEqual(Object.values(AssessmentCycle), [
    "PRE_ASSESSMENT",
    "SA_1",
    "SA_2",
    "SA_3",
  ]);

  const originalFindFirst = prisma.exam.findFirst;
  const originalFindUnique = prisma.exam.findUnique;
  const originalFindMany = prisma.exam.findMany;
  const originalCreate = prisma.exam.create;
  const originalUpdate = prisma.exam.update;
  let persistenceCalls = 0;

  prisma.exam.findFirst = (async () => null) as typeof prisma.exam.findFirst;
  prisma.exam.findUnique = (async () => ({
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-level-1",
  })) as typeof prisma.exam.findUnique;
  prisma.exam.findMany = (async () => {
    persistenceCalls += 1;
    return [];
  }) as typeof prisma.exam.findMany;
  prisma.exam.create = (async () => {
    persistenceCalls += 1;
    return {} as never;
  }) as typeof prisma.exam.create;
  prisma.exam.update = (async () => {
    persistenceCalls += 1;
    return {} as never;
  }) as typeof prisma.exam.update;

  const user = {
    id: "admin-1",
    name: "Admin",
    email: "admin@example.com",
    role: Role.ADMIN,
  };

  try {
    const createResponse = createReply();
    await createExamController(
      {
        user,
        body: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          cycle: "SA-1",
          name: "Exam",
          examDate: "2026-07-25",
          listeningMaxMarks: 10,
          speakingMaxMarks: 10,
          readingMaxMarks: 10,
          writingMaxMarks: 10,
        },
      } as never,
      createResponse.reply as never,
    );

    const updateResponse = createReply();
    await updateExamController(
      {
        user,
        params: { id: "exam-1" },
        body: { cycle: "SA_4" },
      } as never,
      updateResponse.reply as never,
    );

    const listResponse = createReply();
    await getExamsController(
      { user, query: { cycle: "SA-2" } } as never,
      listResponse.reply as never,
    );

    assert.equal(createResponse.statusCode, 400);
    assert.equal(updateResponse.statusCode, 400);
    assert.equal(listResponse.statusCode, 400);
    assert.equal(persistenceCalls, 0);
  } finally {
    prisma.exam.findFirst = originalFindFirst;
    prisma.exam.findUnique = originalFindUnique;
    prisma.exam.findMany = originalFindMany;
    prisma.exam.create = originalCreate;
    prisma.exam.update = originalUpdate;
  }
});

test("exam payload parsing allows only canonical writable fields", () => {
  const validCreate = {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-level-1",
    cycle: AssessmentCycle.SA_1,
    name: "English assessment",
    examDate: "2026-07-25",
    listeningMaxMarks: 10,
    speakingMaxMarks: 10,
    readingMaxMarks: 10,
    writingMaxMarks: 10,
  };

  assert.deepEqual(parseCreateExamRequest(validCreate), { data: validCreate });
  assert.ok(
    "error" in parseCreateExamRequest({ ...validCreate, totalMaxMarks: 1 }),
  );
  assert.ok(
    "error" in
      parseCreateExamRequest({ ...validCreate, listeningMaxMarks: -1 }),
  );
  assert.ok(
    "error" in
      parseCreateExamRequest({ ...validCreate, examDate: "2026-07-24" }),
  );
  assert.deepEqual(parseUpdateExamRequest({ name: "Renamed", cycle: "SA_2" }), {
    data: { name: "Renamed", cycle: AssessmentCycle.SA_2 },
  });
  assert.ok("error" in parseUpdateExamRequest({ examDate: "2026-07-24" }));
  assert.ok("error" in parseUpdateExamRequest({ projectId: "project-2" }));
  assert.ok("error" in parseUpdateExamRequest({ totalMaxMarks: 1 }));
  assert.ok("error" in parseUpdateExamRequest({}));
});

test("exam uniqueness includes the assessment cycle", async () => {
  const originalFindFirst = prisma.exam.findFirst;
  const originalCreate = prisma.exam.create;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;
  let duplicateLookup: Record<string, unknown> | undefined;

  prisma.exam.findFirst = (async (args: { where: Record<string, unknown> }) => {
    duplicateLookup = args.where;
    return null;
  }) as typeof prisma.exam.findFirst;
  prisma.exam.create = (async ({ data }: { data: Record<string, unknown> }) =>
    data as never) as typeof prisma.exam.create;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    await createExam({
      projectId: "project-1",
      centerId: "center-1",
      semesterId: "semester-1",
      semesterLevelId: "semester-level-1",
      cycle: AssessmentCycle.SA_2,
      name: "English assessment",
      examDate: "2026-07-25",
      listeningMaxMarks: 10,
      speakingMaxMarks: 10,
      readingMaxMarks: 10,
      writingMaxMarks: 10,
    });

    assert.equal(duplicateLookup?.cycle, AssessmentCycle.SA_2);
  } finally {
    prisma.exam.findFirst = originalFindFirst;
    prisma.exam.create = originalCreate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("exam uniqueness races return conflict", async () => {
  const originalFindFirst = prisma.exam.findFirst;
  const originalCreate = prisma.exam.create;
  const originalSemesterLevelFindFirst = prisma.semesterLevel.findFirst;

  prisma.exam.findFirst = (async () => null) as typeof prisma.exam.findFirst;
  prisma.exam.create = (async () => {
    throw { code: "P2002" };
  }) as typeof prisma.exam.create;
  prisma.semesterLevel.findFirst = (async () => ({
    id: "semester-level-1",
    academicLevel: { code: ACADEMIC_LEVEL_CODES.LEVEL_1 },
  })) as typeof prisma.semesterLevel.findFirst;

  try {
    const response = createReply();
    await createExamController(
      {
        user: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
        body: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
          semesterLevelId: "semester-level-1",
          cycle: AssessmentCycle.SA_1,
          name: "English assessment",
          examDate: "2026-07-25",
          listeningMaxMarks: 10,
          speakingMaxMarks: 10,
          readingMaxMarks: 10,
          writingMaxMarks: 10,
        },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 409);
  } finally {
    prisma.exam.findFirst = originalFindFirst;
    prisma.exam.create = originalCreate;
    prisma.semesterLevel.findFirst = originalSemesterLevelFindFirst;
  }
});

test("Prisma schema uses one required AssessmentCycle contract", () => {
  const schema = readFileSync(
    new URL("../../prisma/schema.prisma", import.meta.url),
    "utf8",
  );

  assert.match(
    schema,
    /enum AssessmentCycle\s*{\s*PRE_ASSESSMENT\s*SA_1\s*SA_2\s*SA_3\s*}/,
  );
  assert.doesNotMatch(schema, /enum ExamCycle/);
  assert.match(schema, /model SyllabusTopic[\s\S]*?cycle\s+AssessmentCycle\b/);
  assert.match(schema, /model Exam[\s\S]*?cycle\s+AssessmentCycle\b/);
  assert.match(
    schema,
    /@@unique\(\[projectId, centerId, semesterId, semesterLevelId, cycle, name\]\)/,
  );
  assert.match(
    schema,
    /@@index\(\[projectId, centerId, semesterId, semesterLevelId, cycle\]\)/,
  );
});

test("assessment-cycle migration validates and converts legacy topic data", () => {
  const migrationUrl = new URL(
    "../../prisma/migrations/20260721_unify_assessment_cycles/migration.sql",
    import.meta.url,
  );
  assert.equal(existsSync(migrationUrl), true, "migration.sql must exist");
  if (!existsSync(migrationUrl)) return;

  const sql = readFileSync(migrationUrl, "utf8");
  assert.match(sql, /ALTER TYPE "ExamCycle" RENAME TO "AssessmentCycle"/);
  assert.match(sql, /RAISE EXCEPTION/);
  assert.match(sql, /"cycle" IS NULL/);
  assert.match(sql, /NOT IN \('SA-1', 'SA-2', 'SA-3'\)/);
  assert.match(sql, /USING CASE "cycle"/);
  assert.match(sql, /WHEN 'SA-1' THEN 'SA_1'/);
  assert.match(sql, /WHEN 'SA-2' THEN 'SA_2'/);
  assert.match(sql, /WHEN 'SA-3' THEN 'SA_3'/);
  assert.match(sql, /SET NOT NULL/);
  assert.match(sql, /CHECK \("cycle" <> 'PRE_ASSESSMENT'::"AssessmentCycle"\)/);
  assert.match(
    sql,
    /"projectId", "centerId", "semesterId", "level", "cycle", "name"/,
  );
  assert.match(sql, /"projectId", "centerId", "semesterId", "level", "cycle"/);
});
