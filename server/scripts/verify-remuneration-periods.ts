import { SubRole } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

const main = async () => {
  const [assignments, periods, semesters] = await Promise.all([
    prisma.userRoleAssignments.findMany({
      where: {
        semesterId: { not: null },
        subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
      },
      distinct: ["userId", "semesterId"],
      select: { userId: true, semesterId: true },
    }),
    prisma.semesterRemunerationPeriod.findMany({
      orderBy: [
        { userId: "asc" },
        { semesterId: "asc" },
        { effectiveFrom: "asc" },
      ],
    }),
    prisma.semesters.findMany({
      select: { id: true, startDate: true, endDate: true },
    }),
  ]);

  const configured = new Set(
    periods.map((period) => `${period.userId}\0${period.semesterId}`),
  );
  const missing = assignments.filter(
    (assignment) =>
      !configured.has(`${assignment.userId}\0${assignment.semesterId}`),
  );
  const semesterById = new Map(semesters.map((semester) => [semester.id, semester]));
  const structuralErrors: string[] = [];
  const previousByPerson = new Map<string, (typeof periods)[number]>();

  for (const period of periods) {
    const semester = semesterById.get(period.semesterId);
    const key = `${period.userId}\0${period.semesterId}`;
    if (
      !semester ||
      dateOnly(period.effectiveFrom) < dateOnly(semester.startDate) ||
      dateOnly(period.effectiveFrom) > dateOnly(semester.endDate) ||
      (period.effectiveTo &&
        (dateOnly(period.effectiveTo) < dateOnly(semester.startDate) ||
          dateOnly(period.effectiveTo) > dateOnly(semester.endDate)))
    ) {
      structuralErrors.push(`Out-of-semester period ${period.id}`);
    }
    const previous = previousByPerson.get(key);
    if (
      previous &&
      (previous.effectiveTo === null ||
        previous.effectiveTo >= period.effectiveFrom)
    ) {
      structuralErrors.push(`Overlapping period ${period.id}`);
    }
    previousByPerson.set(key, period);
  }

  const report = {
    payableSemesterPeople: assignments.length,
    configuredSchedules: configured.size,
    missingSchedules: missing.length,
    structuralErrors,
  };
  console.log(JSON.stringify(report, null, 2));
  if (structuralErrors.length > 0) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("Remuneration verification failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
