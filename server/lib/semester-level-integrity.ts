export const OPERATIONAL_LEVEL_TABLES = [
  "UserRoleAssignments",
  "StudentEnrollments",
  "Syllabus",
  "Exam",
] as const;

type OperationalLevelTable = (typeof OPERATIONAL_LEVEL_TABLES)[number];
type DuplicateTable = "Syllabus" | "Exam";

export type SemesterLevelIntegrityRow = {
  tableName: string;
  missingSemesterLevelIds: bigint | number;
  orphanedSemesterLevelIds: bigint | number;
  crossSemesterLevelIds: bigint | number;
};

export type DuplicateCanonicalKeyRow = {
  tableName: string;
  duplicateCanonicalKeys: bigint | number;
};

type ReferenceCounts = {
  missingSemesterLevelIds: number;
  orphanedSemesterLevelIds: number;
  crossSemesterLevelIds: number;
};

export type SemesterLevelIntegrityReport = {
  tables: Record<OperationalLevelTable, ReferenceCounts>;
  duplicateCanonicalKeys: Record<DuplicateTable, number>;
};

const emptyCounts = (): ReferenceCounts => ({
  missingSemesterLevelIds: 0,
  orphanedSemesterLevelIds: 0,
  crossSemesterLevelIds: 0,
});

const count = (value: bigint | number) => Number(value);

export const buildSemesterLevelIntegrityReport = (
  referenceRows: SemesterLevelIntegrityRow[],
  duplicateRows: DuplicateCanonicalKeyRow[],
): SemesterLevelIntegrityReport => {
  const tables = Object.fromEntries(
    OPERATIONAL_LEVEL_TABLES.map((tableName) => [tableName, emptyCounts()]),
  ) as Record<OperationalLevelTable, ReferenceCounts>;

  for (const row of referenceRows) {
    if (!OPERATIONAL_LEVEL_TABLES.includes(row.tableName as OperationalLevelTable)) {
      continue;
    }
    tables[row.tableName as OperationalLevelTable] = {
      missingSemesterLevelIds: count(row.missingSemesterLevelIds),
      orphanedSemesterLevelIds: count(row.orphanedSemesterLevelIds),
      crossSemesterLevelIds: count(row.crossSemesterLevelIds),
    };
  }

  const duplicateCanonicalKeys: Record<DuplicateTable, number> = {
    Syllabus: 0,
    Exam: 0,
  };
  for (const row of duplicateRows) {
    if (row.tableName === "Syllabus" || row.tableName === "Exam") {
      duplicateCanonicalKeys[row.tableName] = count(row.duplicateCanonicalKeys);
    }
  }

  return { tables, duplicateCanonicalKeys };
};

export const hasSemesterLevelIntegrityViolations = (
  report: SemesterLevelIntegrityReport,
) =>
  Object.values(report.tables).some((counts) =>
    Object.values(counts).some((value) => value > 0),
  ) || Object.values(report.duplicateCanonicalKeys).some((value) => value > 0);
