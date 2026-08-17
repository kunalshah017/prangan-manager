import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = () =>
  readFile(
    new URL("../../controllers/exam.controller.ts", import.meta.url),
    "utf8",
  );

const controllerBlock = (source: string, exportName: string) => {
  const start = source.indexOf(`export const ${exportName}`);
  assert.ok(start >= 0, `expected ${exportName} export`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
};

const assertPrecedes = (
  block: string,
  earlier: string,
  later: string,
  message: string,
) => {
  const earlierIndex = block.indexOf(earlier);
  const laterIndex = block.indexOf(later);
  assert.ok(earlierIndex >= 0, `${message}: expected ${earlier}`);
  assert.ok(
    laterIndex > earlierIndex,
    `${message}: expected ${later} after ${earlier}`,
  );
};

test("exam controllers resolve exact authorization before exam and score services", async () => {
  const source = await readSource();

  assert.match(source, /security\/exam-authorization\.js/);
  assert.match(source, /getActiveUserScopeAssignments/);
  assert.match(source, /const authorizeExamScope/);

  for (const [exportName, serviceCall] of [
    ["createExamController", "createExam(data)"],
    ["getExamsController", "getExams(parsedFilters)"],
    ["createStudentScoreController", "createStudentScore(data, gradedBy)"],
    ["bulkCreateScoresController", "bulkCreateScores(data, gradedBy)"],
    ["getStudentScoresController", "getStudentScores(filters)"],
  ] as const) {
    assertPrecedes(
      controllerBlock(source, exportName),
      "authorizeExamScope(",
      serviceCall,
      `${exportName} authorization`,
    );
  }
});

test("exam listing resolves a canonical semester level before authorization", async () => {
  const source = await readSource();
  const block = controllerBlock(source, "getExamsController");

  assertPrecedes(
    block,
    "resolveSemesterLevelInput(",
    "authorizeExamScope(",
    "exam list canonical scope",
  );
  assert.match(block, /semesterLevelId:\s*semesterLevel\.id/);
});

test("exam ID controllers load persisted scope before authorization and ID services", async () => {
  const source = await readSource();

  for (const [exportName, scopeLookup, serviceCall] of [
    [
      "getExamByIdController",
      "getExamScope(id)",
      "getExamById(id, includeScores)",
    ],
    ["updateExamController", "getExamScope(id)", "updateExam(id, data)"],
    ["deleteExamController", "getExamScope(id)", "deleteExam(id)"],
    [
      "getExamStatisticsController",
      "getExamScope(id)",
      "getExamStatistics(id)",
    ],
    [
      "getStudentScoreByIdController",
      "getScoreScope(id)",
      "getStudentScoreById(id)",
    ],
    [
      "updateStudentScoreController",
      "getScoreScope(id)",
      "updateStudentScore(id, data, gradedBy)",
    ],
  ] as const) {
    const block = controllerBlock(source, exportName);
    assertPrecedes(
      block,
      scopeLookup,
      "authorizeExamScope(",
      `${exportName} scope`,
    );
    assertPrecedes(
      block,
      "authorizeExamScope(",
      serviceCall,
      `${exportName} service`,
    );
  }
});

test("non-admin score listing derives authorization only from an exam ID", async () => {
  const source = await readSource();
  const block = controllerBlock(source, "getStudentScoresController");

  assert.match(block, /request\.user\.role !== Role\.ADMIN/);
  assert.match(block, /!filters\.examId/);
  assert.match(source, /const forbidden[\s\S]*?reply\.status\(403\)/);
  assertPrecedes(
    block,
    "getExamScope(filters.examId)",
    "authorizeExamScope(",
    "score list scope",
  );
});

test("exam scope lookups select only the authorization fields", async () => {
  const source = await readFile(
    new URL("../../service/exam.service.ts", import.meta.url),
    "utf8",
  );
  const scoreScopeBlock = source.slice(
    source.indexOf("export const getScoreScope"),
    source.indexOf("// ================================="),
  );

  assert.match(
    source,
    /export const getExamScope[\s\S]*?prisma\.exam\.findUnique\([\s\S]*?select:\s*\{[\s\S]*?projectId:\s*true[\s\S]*?centerId:\s*true[\s\S]*?semesterId:\s*true[\s\S]*?semesterLevelId:\s*true[\s\S]*?\}/,
  );
  assert.match(
    scoreScopeBlock,
    /prisma\.studentExamScore[\s\S]*?findUnique\([\s\S]*?exam:\s*\{\s*select:\s*\{[\s\S]*?projectId:\s*true[\s\S]*?centerId:\s*true[\s\S]*?semesterId:\s*true[\s\S]*?semesterLevelId:\s*true[\s\S]*?\}/,
  );
});
