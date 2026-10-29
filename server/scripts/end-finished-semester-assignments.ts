import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { indiaToday, isSemesterFinished } from "../lib/role-assignments.js";

// Ends role assignments whose semester is over, so people keep only the roles
// they hold now. Dry run unless --apply is passed. Assignments are ended, never
// deleted: attendance and pay history keep pointing at them.

type Candidate = {
  id: string;
  userName: string;
  subRole: string;
  centreName: string | null;
  semesterName: string;
  semesterStatus: string;
  semesterEndDate: Date;
  assignedAt: Date;
};

export const parseArgs = (args: string[]): { apply: boolean; backupPath?: string } => {
  let apply = false;
  let backupPath: string | undefined;
  for (const argument of args) {
    if (argument === "--apply") apply = true;
    else if (argument.startsWith("--backup=")) backupPath = argument.slice("--backup=".length);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return { apply, backupPath };
};

export { indiaToday, isSemesterFinished };

// The role ended when its semester did, not on the day this script ran.
// Semester end dates are stored as the last millisecond of the day in UTC,
// which is already the next day in India, so keep only the calendar day.
export const endDateFor = (candidate: Pick<Candidate, "semesterEndDate" | "assignedAt">) => {
  const lastDay = new Date(`${candidate.semesterEndDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return lastDay > candidate.assignedAt ? lastDay : candidate.assignedAt;
};

export const runEndFinishedSemesterAssignments = async (
  options: { apply: boolean; backupPath?: string },
  prisma: any,
) => {
  const today = indiaToday();
  const active = await prisma.userRoleAssignments.findMany({
    where: { isActive: true, semesterId: { not: null } },
    select: {
      id: true,
      subRole: true,
      assignedAt: true,
      user: { select: { name: true } },
      center: { select: { name: true } },
      semester: { select: { name: true, status: true, endDate: true } },
    },
  });

  const candidates: Candidate[] = active
    .filter((row: any) => row.semester && isSemesterFinished(row.semester, today))
    .map((row: any) => ({
      id: row.id,
      userName: row.user.name,
      subRole: row.subRole,
      centreName: row.center?.name ?? null,
      semesterName: row.semester.name,
      semesterStatus: row.semester.status,
      semesterEndDate: row.semester.endDate,
      assignedAt: row.assignedAt,
    }));

  const bySemester = new Map<string, number>();
  for (const candidate of candidates) {
    const key = `${candidate.centreName ?? "No centre"}: ${candidate.semesterName}`;
    bySemester.set(key, (bySemester.get(key) ?? 0) + 1);
  }

  if (options.apply && candidates.length > 0) {
    if (!options.backupPath) throw new Error("--apply needs --backup=<file> so the change can be undone.");
    await writeFile(
      options.backupPath,
      JSON.stringify({ today, endedIds: candidates.map((candidate) => candidate.id), candidates }, null, 2),
      "utf8",
    );
    await prisma.$transaction(
      candidates.map((candidate) =>
        prisma.userRoleAssignments.update({
          where: { id: candidate.id, isActive: true },
          data: { isActive: false, endedAt: endDateFor(candidate) },
        }),
      ),
    );
  }

  return {
    mode: options.apply ? "apply" : "dry-run",
    today,
    activeWithSemester: active.length,
    toEnd: candidates.length,
    bySemester: Object.fromEntries([...bySemester.entries()].sort()),
    people: [...new Set(candidates.map((candidate) => candidate.userName))].length,
  };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const { prisma } = await import("../lib/prisma.js");
  try {
    console.log(JSON.stringify(await runEndFinishedSemesterAssignments(options, prisma), null, 2));
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
