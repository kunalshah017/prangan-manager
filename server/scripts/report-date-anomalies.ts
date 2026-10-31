import { pathToFileURL } from "node:url";

// Read-only. Lists stored dates that break the calendar rules, so a person can
// check them. Run it before the 20261031120000 migration to see the semester
// and birth dates that migration will move, and any time to find attendance or
// exams on weekdays (old clients defaulted to the UTC day, which is the day
// before in India until 05:30). Those cannot be repaired automatically: only the
// centre knows which day was meant.

type Check = { name: string; sql: string };

const isTimestamp = async (prisma: any, table: string, column: string) =>
  (
    await prisma.$queryRawUnsafe(
      `select data_type from information_schema.columns
       where table_schema = current_schema() and table_name = $1 and column_name = $2`,
      table,
      column,
    )
  )[0]?.data_type?.startsWith("timestamp") ?? false;

export const buildChecks = async (prisma: any): Promise<Check[]> => {
  const checks: Check[] = [
    {
      name: "Staff attendance on a weekday",
      sql: `select a.id, a.date::text as date, u.name as person, s.name as semester
            from "UserAttendance" a join "User" u on u.id = a."userId"
            join "Semesters" s on s.id = a."semesterId"
            where extract(isodow from a.date) < 6 order by a.date`,
    },
    {
      name: "Student attendance on a weekday",
      sql: `select a.id, a.date::text as date, a."studentId", s.name as semester
            from "StudentAttendance" a join "Semesters" s on s.id = a."semesterId"
            where extract(isodow from a.date) < 6 order by a.date`,
    },
    {
      name: "Exam on a weekday",
      sql: `select e.id, e."examDate"::text as date, e.name, e.cycle::text as cycle
            from "Exam" e where extract(isodow from e."examDate") < 6 order by e."examDate"`,
    },
    {
      name: "Remuneration payment dated differently from its own period",
      sql: `select x.id, x."incurredOn"::text as date, x.metadata->>'periodEnd' as "periodEnd"
            from "Expense" x where x."expenseType" = 'REMUNERATION'
            and x.metadata->>'periodEnd' is not null
            and x."incurredOn" <> (x.metadata->>'periodEnd')::date`,
    },
  ];

  // Before the migration these are timestamps; show the ones it will move.
  if (await isTimestamp(prisma, "Semesters", "startDate")) {
    checks.push({
      name: "Semester dates the migration will move (not stored at the app's times)",
      sql: `select id, name, "startDate"::text as "startDate", "endDate"::text as "endDate"
            from "Semesters"
            where "startDate"::time <> '00:00'
               or "endDate"::time not in ('23:59:59.999', '00:00')`,
    });
  }
  for (const table of ["User", "Students"]) {
    if (await isTimestamp(prisma, table, "dob")) {
      checks.push({
        name: `${table} birth dates the migration will move`,
        sql: `select id, dob::text as dob from "${table}"
              where dob is not null and dob::time <> '00:00'`,
      });
    }
  }
  return checks;
};

export const runReportDateAnomalies = async (prisma: any, limit = 50) => {
  const report: Record<string, { count: number; rows: unknown[] }> = {};
  for (const check of await buildChecks(prisma)) {
    const rows: unknown[] = await prisma.$queryRawUnsafe(check.sql);
    report[check.name] = { count: rows.length, rows: rows.slice(0, limit) };
  }
  return report;
};

const main = async (): Promise<void> => {
  const { prisma } = await import("../lib/prisma.js");
  try {
    console.log(JSON.stringify(await runReportDateAnomalies(prisma), null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
