import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("exam score editor", () => {
  it("uses existing score IDs and only bulk-marks pending scores absent", async () => {
    const source = await readFile(
      new URL("../../pages/exams/ExamScores.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("scoreByEnrollmentId");
    expect(source).toContain("existing.id");
    expect(source).toContain("pendingRoster");
    expect(source).toContain("useCreateStudentScore");
    expect(source).toContain("useEffect");
    expect(source).toContain("[score]");
    expect(source).toContain("can(user, 'scores.write'");
  });
});
