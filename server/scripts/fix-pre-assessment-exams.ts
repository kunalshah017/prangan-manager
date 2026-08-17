import {
  AssessmentCycle,
  PrismaClient,
} from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Levels allowed per center name
const ALLOWED_LEVELS_BY_CENTER: Record<string, string[]> = {
  Lavender: ["PRIMARY_B", "LEVEL_1", "LEVEL_2"],
  // Tulip allows all levels — add other centers here if needed
};

async function main() {
  const exams = await prisma.exam.findMany({
    where: { cycle: AssessmentCycle.PRE_ASSESSMENT },
    include: {
      center: true,
      semester: true,
      semesterLevel: { include: { academicLevel: true } },
    },
  });

  console.log(`Found ${exams.length} Pre Assessment exam(s).\n`);

  for (const exam of exams) {
    const centerName = exam.center.name;
    const semesterName = exam.semester.name; // e.g. "Semester Year 2025-26"
    const allowedLevels = ALLOWED_LEVELS_BY_CENTER[centerName];
    const levelCode = exam.semesterLevel.academicLevel.code;
    const levelName = exam.semesterLevel.academicLevel.name;

    // Delete if this center has level restrictions and this level isn't allowed
    if (allowedLevels && !allowedLevels.includes(levelCode)) {
      await prisma.exam.delete({ where: { id: exam.id } });
      console.log(
        `DELETED: [${centerName}] ${levelName} — not allowed for this center`,
      );
      continue;
    }

    // Rename to match SA-3 naming pattern: "Level 1 l Pre Assessment | Semester 2025-26"
    // Extract the year part from the semester name — SA-3 exams use e.g. "Semester 2025-26"
    // The semester name in DB is "Semester Year 2025-26", SA-3 exams use "Semester 2025-26"
    // Let's match exactly: strip "Year " if present
    const semesterLabel = semesterName.replace("Year ", ""); // "Semester 2025-26"
    const newName = `${levelName} l Pre Assessment | ${semesterLabel}`;

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
