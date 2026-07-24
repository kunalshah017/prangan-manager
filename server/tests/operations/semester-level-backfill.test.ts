import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LEGACY_LEVELS,
  parseBackfillArgs,
  runSemesterLevelBackfill,
} from "../../scripts/backfill-semester-levels.js";

test("semester-level backfill defaults to read-only dry run", () => {
  assert.deepEqual(parseBackfillArgs([]), {
    apply: false,
    verify: false,
    reportPath: null,
    batchSize: 500,
  });
});

test("semester-level backfill requires explicit apply and protected report", () => {
  assert.throws(
    () => parseBackfillArgs(["--apply"]),
    /--report is required with --apply/,
  );
  assert.deepEqual(
    parseBackfillArgs([
      "--apply",
      "--report=/protected/semester-levels.json",
      "--batch-size=250",
    ]),
    {
      apply: true,
      verify: false,
      reportPath: "/protected/semester-levels.json",
      batchSize: 250,
    },
  );
  assert.throws(
    () => parseBackfillArgs(["--apply", "--verify", "--report=/tmp/x"]),
    /cannot be combined/,
  );
  assert.throws(() => parseBackfillArgs(["--force"]), /Unknown argument/);
});

test("canonical backfill contains exactly the six existing chronological levels", () => {
  assert.deepEqual(LEGACY_LEVELS, [
    { code: "PRIMARY_A", name: "Primary A", journeyOrder: 100 },
    { code: "PRIMARY_B", name: "Primary B", journeyOrder: 200 },
    { code: "LEVEL_1", name: "Level 1", journeyOrder: 300 },
    { code: "LEVEL_2", name: "Level 2", journeyOrder: 400 },
    { code: "LEVEL_3", name: "Level 3", journeyOrder: 500 },
    { code: "LEVEL_4", name: "Level 4", journeyOrder: 600 },
  ]);
  assert.equal(
    LEGACY_LEVELS.some((level) => level.code === "PRIMARY_C"),
    false,
  );
});

test("dry run reports pending mappings without treating them as applied-data corruption", async () => {
  const delegate = {
    count: async ({ where }: any = {}) =>
      where?.semesterLevelId === null ? 4 : 0,
    findMany: async () => [],
  };
  const prisma = {
    semesters: { findMany: async () => [{ id: "semester-1" }] },
    academicLevel: { count: async () => 0 },
    semesterLevel: { count: async () => 0 },
    studentEnrollments: delegate,
    userRoleAssignments: delegate,
    syllabus: delegate,
    exam: delegate,
  };

  const result = await runSemesterLevelBackfill(
    { apply: false, verify: false, reportPath: null, batchSize: 500 },
    prisma,
  );

  assert.equal(result.report.tables.StudentEnrollments.missingMappings, 4);
  assert.deepEqual(result.report.blockingErrors, []);
  assert.equal(result.exitCode, 0);
});

test("backfill maps every legacy level-bearing table and verifies parity", async () => {
  const source = await readFile(
    new URL("../../scripts/backfill-semester-levels.ts", import.meta.url),
    "utf8",
  );

  for (const delegate of [
    "studentEnrollments",
    "userRoleAssignments",
    "syllabus",
    "exam",
  ]) {
    assert.match(source, new RegExp(`prisma\\.${delegate}`));
  }
  assert.match(source, /semesterLevelId: null/);
  assert.match(source, /academicLevel:\s*\{\s*select:\s*\{\s*code: true/);
  assert.match(source, /blockingErrors/);
  assert.doesNotMatch(source, /DATABASE_URL|password|connectionString/);
});

test("apply creates six memberships per semester and maps all four tables idempotently", async () => {
  const catalog = LEGACY_LEVELS.map((level, index) => ({
    id: `level-${index + 1}`,
    code: level.code,
  }));
  const memberships = catalog.map((level, index) => ({
    id: `membership-${index + 1}`,
    semesterId: "semester-1",
    academicLevel: { code: level.code },
  }));
  const catalogUpserts: unknown[] = [];
  const membershipUpserts: unknown[] = [];
  const mapped = new Set<string>();

  const delegate = (name: string) => ({
    count: async ({ where }: any = {}) => {
      if (where?.semesterLevelId === null) return 0;
      if (where?.semesterLevel?.isActive === false) return 0;
      return mapped.has(name) ? 6 : 0;
    },
    findMany: async () => [],
    updateMany: ({ data }: any) => ({
      execute: async () => {
        const first = !mapped.has(name);
        mapped.add(name);
        return { count: first ? 1 : 0, semesterLevelId: data.semesterLevelId };
      },
    }),
  });
  const delegates = {
    studentEnrollments: delegate("StudentEnrollments"),
    userRoleAssignments: delegate("UserRoleAssignments"),
    syllabus: delegate("Syllabus"),
    exam: delegate("Exam"),
  };
  const transactionClient = {
    academicLevel: {
      upsert: async (args: unknown) => catalogUpserts.push(args),
      findMany: async () => catalog,
    },
    semesterLevel: {
      upsert: async (args: unknown) => membershipUpserts.push(args),
    },
  };
  const prisma = {
    ...delegates,
    semesters: { findMany: async () => [{ id: "semester-1" }] },
    academicLevel: { count: async () => 6 },
    semesterLevel: {
      count: async () => 6,
      findMany: async () => memberships,
    },
    $transaction: async (input: any) => {
      if (typeof input === "function") return input(transactionClient);
      return Promise.all(input.map((operation: any) => operation.execute()));
    },
  };
  const options = {
    apply: true,
    verify: false,
    reportPath: null,
    batchSize: 2,
  };

  const first = await runSemesterLevelBackfill(options, prisma);
  const second = await runSemesterLevelBackfill(options, prisma);

  assert.equal(catalogUpserts.length, 12);
  assert.equal(membershipUpserts.length, 12);
  assert.deepEqual(
    Object.values(first.report.tables).map((summary) => summary.updated),
    [1, 1, 1, 1],
  );
  assert.deepEqual(
    Object.values(second.report.tables).map((summary) => summary.updated),
    [0, 0, 0, 0],
  );
  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
});
