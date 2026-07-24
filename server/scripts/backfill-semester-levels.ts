import { closeSync, openSync, writeFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

export const LEGACY_LEVELS = [
  { code: "PRIMARY_A", name: "Primary A", journeyOrder: 100 },
  { code: "PRIMARY_B", name: "Primary B", journeyOrder: 200 },
  { code: "LEVEL_1", name: "Level 1", journeyOrder: 300 },
  { code: "LEVEL_2", name: "Level 2", journeyOrder: 400 },
  { code: "LEVEL_3", name: "Level 3", journeyOrder: 500 },
  { code: "LEVEL_4", name: "Level 4", journeyOrder: 600 },
] as const;

export interface BackfillArgs {
  apply: boolean;
  verify: boolean;
  reportPath: string | null;
  batchSize: number;
}

export const parseBackfillArgs = (args: string[]): BackfillArgs => {
  const result: BackfillArgs = {
    apply: false,
    verify: false,
    reportPath: null,
    batchSize: 500,
  };

  for (const argument of args) {
    if (argument === "--apply") result.apply = true;
    else if (argument === "--verify") result.verify = true;
    else if (argument.startsWith("--report=")) {
      result.reportPath = argument.slice("--report=".length);
    } else if (argument.startsWith("--batch-size=")) {
      result.batchSize = Number(argument.slice("--batch-size=".length));
    } else throw new Error(`Unknown argument: ${argument}`);
  }

  if (result.apply && result.verify) {
    throw new Error("--apply and --verify cannot be combined.");
  }
  if (result.apply && !result.reportPath) {
    throw new Error("--report is required with --apply.");
  }
  if (result.reportPath && !isAbsolute(result.reportPath)) {
    throw new Error("--report must be an absolute protected path.");
  }
  if (
    !Number.isInteger(result.batchSize) ||
    result.batchSize < 1 ||
    result.batchSize > 5000
  ) {
    throw new Error("--batch-size must be an integer between 1 and 5000.");
  }

  return result;
};

type TableName =
  | "StudentEnrollments"
  | "UserRoleAssignments"
  | "Syllabus"
  | "Exam";

type TableSummary = {
  legacyRows: number;
  missingMappings: number;
  mismatches: number;
  inactiveReferences: number;
  updated: number;
};

export type BackfillReport = {
  mode: "dry-run" | "apply" | "verify";
  catalogLevels: number;
  semesters: number;
  activeSemesterMemberships: number;
  tables: Record<TableName, TableSummary>;
  blockingErrors: string[];
};

type PrismaLike = any;
type MappingWorkItem = {
  semesterId: string;
  levelCode: (typeof LEGACY_LEVELS)[number]["code"];
  semesterLevelId: string | undefined;
};

const emptyTableSummary = (): TableSummary => ({
  legacyRows: 0,
  missingMappings: 0,
  mismatches: 0,
  inactiveReferences: 0,
  updated: 0,
});

const createReport = (mode: BackfillReport["mode"]): BackfillReport => ({
  mode,
  catalogLevels: 0,
  semesters: 0,
  activeSemesterMemberships: 0,
  tables: {
    StudentEnrollments: emptyTableSummary(),
    UserRoleAssignments: emptyTableSummary(),
    Syllabus: emptyTableSummary(),
    Exam: emptyTableSummary(),
  },
  blockingErrors: [],
});

const tableDelegates = (prisma: PrismaLike) => [
  {
    name: "StudentEnrollments" as const,
    delegate: prisma.studentEnrollments,
    legacyWhere: {},
    missingWhere: { semesterLevelId: null },
  },
  {
    name: "UserRoleAssignments" as const,
    delegate: prisma.userRoleAssignments,
    legacyWhere: { level: { not: null } },
    missingWhere: { level: { not: null }, semesterLevelId: null },
  },
  {
    name: "Syllabus" as const,
    delegate: prisma.syllabus,
    legacyWhere: {},
    missingWhere: { semesterLevelId: null },
  },
  {
    name: "Exam" as const,
    delegate: prisma.exam,
    legacyWhere: {},
    missingWhere: { semesterLevelId: null },
  },
];

const inspectTable = async (
  delegate: any,
  legacyWhere: Record<string, unknown>,
  missingWhere: Record<string, unknown>,
  summary: TableSummary,
): Promise<void> => {
  summary.legacyRows = await delegate.count({ where: legacyWhere });
  summary.missingMappings = await delegate.count({ where: missingWhere });
  summary.inactiveReferences = await delegate.count({
    where: {
      isActive: true,
      semesterLevelId: { not: null },
      semesterLevel: { isActive: false },
    },
  });

  let cursor: string | undefined;
  while (true) {
    const rows = await delegate.findMany({
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      where: { semesterLevelId: { not: null } },
      select: {
        id: true,
        level: true,
        semesterLevel: {
          select: { academicLevel: { select: { code: true } } },
        },
      },
    });
    if (rows.length === 0) break;
    summary.mismatches += rows.filter(
      (row: any) =>
        !row.semesterLevel ||
        row.level !== row.semesterLevel.academicLevel.code,
    ).length;
    cursor = rows[rows.length - 1].id;
  }
};

const reserveReport = (path: string | null): number | null =>
  path ? openSync(path, "wx", 0o600) : null;

const finishReport = (
  descriptor: number | null,
  report: BackfillReport,
): void => {
  if (descriptor === null) return;
  try {
    writeFileSync(descriptor, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }
};

export const runSemesterLevelBackfill = async (
  options: BackfillArgs,
  prisma: PrismaLike,
): Promise<{ report: BackfillReport; exitCode: number }> => {
  const report = createReport(
    options.verify ? "verify" : options.apply ? "apply" : "dry-run",
  );
  const reportDescriptor = reserveReport(options.reportPath);

  try {
    const semesters = await prisma.semesters.findMany({
      orderBy: { id: "asc" },
      select: { id: true },
    });
    report.semesters = semesters.length;

    if (options.apply) {
      await prisma.$transaction(async (transaction: PrismaLike) => {
        for (const level of LEGACY_LEVELS) {
          await transaction.academicLevel.upsert({
            where: { code: level.code },
            create: level,
            update: {
              name: level.name,
              journeyOrder: level.journeyOrder,
              isActive: true,
            },
          });
        }
        const catalog = await transaction.academicLevel.findMany({
          where: { code: { in: LEGACY_LEVELS.map((level) => level.code) } },
          select: { id: true, code: true },
        });
        const catalogByCode = new Map(
          catalog.map((level: any) => [level.code, level.id]),
        );
        for (const semester of semesters) {
          for (const level of LEGACY_LEVELS) {
            const academicLevelId = catalogByCode.get(level.code);
            if (!academicLevelId)
              throw new Error(`Missing catalog level ${level.code}`);
            await transaction.semesterLevel.upsert({
              where: {
                semesterId_academicLevelId: {
                  semesterId: semester.id,
                  academicLevelId,
                },
              },
              create: {
                semesterId: semester.id,
                academicLevelId,
                isActive: true,
              },
              update: { isActive: true },
            });
          }
        }
      });

      const memberships = await prisma.semesterLevel.findMany({
        where: {
          semesterId: { in: semesters.map((semester: any) => semester.id) },
          academicLevel: {
            code: { in: LEGACY_LEVELS.map((level) => level.code) },
          },
        },
        select: {
          id: true,
          semesterId: true,
          academicLevel: { select: { code: true } },
        },
      });
      const membershipByKey = new Map(
        memberships.map((membership: any) => [
          `${membership.semesterId}:${membership.academicLevel.code}`,
          membership.id,
        ]),
      );
      const work: MappingWorkItem[] = semesters.flatMap((semester: any) =>
        LEGACY_LEVELS.map((level) => ({
          semesterId: semester.id,
          levelCode: level.code,
          semesterLevelId: membershipByKey.get(`${semester.id}:${level.code}`),
        })),
      );

      for (const { name, delegate } of tableDelegates(prisma)) {
        for (
          let offset = 0;
          offset < work.length;
          offset += options.batchSize
        ) {
          const batch = work.slice(offset, offset + options.batchSize);
          await prisma
            .$transaction(
              batch.map((item: MappingWorkItem) => {
                if (!item.semesterLevelId) {
                  throw new Error(
                    `Missing semester membership ${item.semesterId}:${item.levelCode}`,
                  );
                }
                return delegate.updateMany({
                  where: {
                    semesterId: item.semesterId,
                    level: item.levelCode,
                    semesterLevelId: null,
                  },
                  data: { semesterLevelId: item.semesterLevelId },
                });
              }),
            )
            .then((results: Array<{ count: number }>) => {
              report.tables[name].updated += results.reduce(
                (total, result) => total + result.count,
                0,
              );
            });
        }
      }
    }

    report.catalogLevels = await prisma.academicLevel.count({
      where: { code: { in: LEGACY_LEVELS.map((level) => level.code) } },
    });
    report.activeSemesterMemberships = await prisma.semesterLevel.count({
      where: {
        isActive: true,
        academicLevel: {
          code: { in: LEGACY_LEVELS.map((level) => level.code) },
        },
      },
    });

    for (const { name, delegate, legacyWhere, missingWhere } of tableDelegates(
      prisma,
    )) {
      await inspectTable(
        delegate,
        legacyWhere,
        missingWhere,
        report.tables[name],
      );
      if (
        (options.apply || options.verify) &&
        report.tables[name].missingMappings > 0
      ) {
        report.blockingErrors.push(
          `${name} has missing semester-level mappings`,
        );
      }
      if (report.tables[name].mismatches > 0) {
        report.blockingErrors.push(`${name} has legacy-code mismatches`);
      }
      if (report.tables[name].inactiveReferences > 0) {
        report.blockingErrors.push(
          `${name} references inactive semester levels`,
        );
      }
    }

    const expectedMemberships = report.semesters * LEGACY_LEVELS.length;
    if (options.verify && report.catalogLevels !== LEGACY_LEVELS.length) {
      report.blockingErrors.push(
        "Canonical academic-level catalog is incomplete",
      );
    }
    if (
      options.verify &&
      report.activeSemesterMemberships !== expectedMemberships
    ) {
      report.blockingErrors.push(
        "Existing semesters are missing active level memberships",
      );
    }

    finishReport(reportDescriptor, report);
    console.log(JSON.stringify(report, null, 2));
    return { report, exitCode: report.blockingErrors.length > 0 ? 1 : 0 };
  } catch (error) {
    if (reportDescriptor !== null) closeSync(reportDescriptor);
    throw error;
  }
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

const main = async (): Promise<void> => {
  const { prisma } = await import("../lib/prisma.js");
  try {
    const result = await runSemesterLevelBackfill(
      parseBackfillArgs(process.argv.slice(2)),
      prisma,
    );
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (isMain) void main();
