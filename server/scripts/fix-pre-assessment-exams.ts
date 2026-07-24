import {
  AssessmentCycle,
  PrismaClient,
  Level,
} from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Levels allowed per center name
const ALLOWED_LEVELS_BY_CENTER: Record<string, string[]> = {
  Lavender: [Level.PRIMARY_B, Level.LEVEL_1, Level.LEVEL_2],
  // Tulip allows all levels — add other centers here if needed
};

// Display name mapping for level enum values
const LEVEL_DISPLAY: Record<string, string> = {
  [Level.LEVEL_1]: "Level 1",
  [Level.LEVEL_2]: "Level 2",
  [Level.LEVEL_3]: "Level 3",
  [Level.LEVEL_4]: "Level 4",
  [Level.PRIMARY_A]: "Primary A",
  [Level.PRIMARY_B]: "Primary B",
};

async function main() {
  const exams = await prisma.exam.findMany({
    where: { cycle: AssessmentCycle.PRE_ASSESSMENT },
    include: { center: true, semester: true },
  });

  console.log(`Found ${exams.length} Pre Assessment exam(s).\n`);

  for (const exam of exams) {
    const centerName = exam.center.name;
    const semesterName = exam.semester.name; // e.g. "Semester Year 2025-26"
    const allowedLevels = ALLOWED_LEVELS_BY_CENTER[centerName];

    // Delete if this center has level restrictions and this level isn't allowed
    if (allowedLevels && !allowedLevels.includes(exam.level)) {
      await prisma.exam.delete({ where: { id: exam.id } });
      console.log(
        `DELETED: [${centerName}] ${exam.level} — not allowed for this center`,
      );
      continue;
    }

    // Rename to match SA-3 naming pattern: "Level 1 l Pre Assessment | Semester 2025-26"
    // Extract the year part from the semester name — SA-3 exams use e.g. "Semester 2025-26"
    // The semester name in DB is "Semester Year 2025-26", SA-3 exams use "Semester 2025-26"
    // Let's match exactly: strip "Year " if present
    const semesterLabel = semesterName.replace("Year ", ""); // "Semester 2025-26"
    const newName = `${LEVEL_DISPLAY[exam.level] ?? exam.level} l Pre Assessment | ${semesterLabel}`;

    if (exam.name !== newName) {
      await prisma.exam.update({
        where: { id: exam.id },
        data: { name: newName },
      });
      console.log(`RENAMED: [${centerName}] "${exam.name}" → "${newName}"`);
    } else {
      console.log(`OK: [${centerName}] "${exam.name}" — name already correct`);
    }
  }

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
