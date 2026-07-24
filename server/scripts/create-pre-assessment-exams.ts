import {
  AssessmentCycle,
  PrismaClient,
  Level,
} from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const ALL_LEVELS: Level[] = [
  Level.LEVEL_1,
  Level.LEVEL_2,
  Level.LEVEL_3,
  Level.LEVEL_4,
  Level.PRIMARY_A,
  Level.PRIMARY_B,
];

async function main() {
  // 1. Find the 2025-2026 semester (look for semesters whose name contains 2025 or 2026)
  const allSemesters = await prisma.semesters.findMany({
    where: {
      OR: [
        { name: { contains: "2025", mode: "insensitive" } },
        { name: { contains: "2026", mode: "insensitive" } },
      ],
    },
    include: { center: true },
    orderBy: { startDate: "desc" },
  });

  console.log(`Found ${allSemesters.length} semester(s) matching 2025/2026:`);
  allSemesters.forEach((s) =>
    console.log(
      `  - [${s.id}] "${s.name}" | Center: ${s.center.name} (${s.centerId})`,
    ),
  );

  if (allSemesters.length === 0) {
    // Fall back: show all semesters
    const allS = await prisma.semesters.findMany({
      include: { center: true },
      orderBy: { startDate: "desc" },
    });
    console.log("\nNo 2025/2026 semesters found. All semesters:");
    allS.forEach((s) =>
      console.log(
        `  - [${s.id}] "${s.name}" | Center: ${s.center.name} | Start: ${s.startDate.toISOString().slice(0, 10)}`,
      ),
    );
    return;
  }

  // 2. Get SA-3 exams to copy marking schemes
  const sa3Exams = await prisma.exam.findMany({
    where: { cycle: AssessmentCycle.SA_3 },
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `\nFound ${sa3Exams.length} SA-3 exam(s) to copy marking schemes from:`,
  );
  sa3Exams.forEach((e) =>
    console.log(
      `  - [${e.level}] "${e.name}" | L:${e.listeningMaxMarks} S:${e.speakingMaxMarks} R:${e.readingMaxMarks} W:${e.writingMaxMarks} Total:${e.totalMaxMarks}`,
    ),
  );

  // Build marking scheme map: level -> marks
  // Use the most recent SA-3 exam per level (across all centers) as the template
  const markingSchemeByLevel: Record<
    string,
    {
      listeningMaxMarks: number;
      speakingMaxMarks: number;
      readingMaxMarks: number;
      writingMaxMarks: number;
      totalMaxMarks: number;
    }
  > = {};

  for (const exam of sa3Exams) {
    if (!markingSchemeByLevel[exam.level]) {
      markingSchemeByLevel[exam.level] = {
        listeningMaxMarks: exam.listeningMaxMarks,
        speakingMaxMarks: exam.speakingMaxMarks,
        readingMaxMarks: exam.readingMaxMarks,
        writingMaxMarks: exam.writingMaxMarks,
        totalMaxMarks: exam.totalMaxMarks,
      };
    }
  }

  console.log("\nMarking schemes by level:");
  for (const [level, scheme] of Object.entries(markingSchemeByLevel)) {
    console.log(
      `  ${level}: L=${scheme.listeningMaxMarks} S=${scheme.speakingMaxMarks} R=${scheme.readingMaxMarks} W=${scheme.writingMaxMarks} Total=${scheme.totalMaxMarks}`,
    );
  }

  // Default marking scheme if no SA-3 found for a level (fallback)
  const DEFAULT_SCHEME = {
    listeningMaxMarks: 10,
    speakingMaxMarks: 10,
    readingMaxMarks: 15,
    writingMaxMarks: 15,
    totalMaxMarks: 50,
  };

  // 3. Create PRE_ASSESSMENT exams for each semester/level combination
  let created = 0;
  let skipped = 0;

  for (const semester of allSemesters) {
    for (const level of ALL_LEVELS) {
      const scheme = markingSchemeByLevel[level] ?? DEFAULT_SCHEME;
      const examName = `Pre Assessment`;

      // Check if already exists
      const existing = await prisma.exam.findFirst({
        where: {
          centerId: semester.centerId,
          semesterId: semester.id,
          level,
          cycle: AssessmentCycle.PRE_ASSESSMENT,
          name: examName,
        },
      });

      if (existing) {
        console.log(
          `  SKIP: Pre Assessment already exists for ${semester.center.name} | ${level} | Semester: ${semester.name}`,
        );
        skipped++;
        continue;
      }

      await prisma.exam.create({
        data: {
          projectId: semester.center.projectId,
          centerId: semester.centerId,
          semesterId: semester.id,
          level,
          cycle: AssessmentCycle.PRE_ASSESSMENT,
          name: examName,
          description: `Pre Assessment exam for ${level.replace("_", " ")} - ${semester.name}`,
          examDate: semester.startDate, // Use semester start date as exam date
          ...scheme,
          isActive: true,
        },
      });

      console.log(
        `  CREATED: Pre Assessment | ${semester.center.name} | ${level} | Semester: ${semester.name}`,
      );
      created++;
    }
  }

  console.log(
    `\nDone! Created: ${created}, Skipped (already existed): ${skipped}`,
  );
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
