import { prisma } from "../lib/prisma.js";
import { runSemesterLevelBackfill } from "./backfill-semester-levels.js";

const main = async () => {
  try {
    const { exitCode } = await runSemesterLevelBackfill(
      { apply: false, verify: true, reportPath: null, batchSize: 500 },
      prisma,
    );
    process.exitCode = exitCode;
  } finally {
    await prisma.$disconnect();
  }
};

void main();
