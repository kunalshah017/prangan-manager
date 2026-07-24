import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("exam score editor", () => {
  it("keeps the ID returned by score creation and uses the shared write policy", async () => {
    const source = await readFile(
      new URL("../../pages/exams/ExamScores.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      "const createdScores = await bulkCreateMutation.mutateAsync",
    );
    expect(source).toContain("existingScoreId: createdScores[0]?.id");
    expect(source).toContain("can(user, 'scores.write'");
  });
});
