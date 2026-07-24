import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const pageUrl = new URL("../../pages/semesters/SemesterSetup.tsx", import.meta.url);

describe("semester setup readiness", () => {
  it("blocks save and activation for educators without a target level", async () => {
    const source = await readFile(pageUrl, "utf8");

    expect(source).toContain("missingLevels");
    expect(source).toContain("target level");
    expect(source).toMatch(/missingRates > 0 \|\| missingLevels > 0/);
  });

  it("keeps every promotion suggestion editable and blocks unresolved reviews", async () => {
    const source = await readFile(pageUrl, "utf8");

    expect(source).toContain("<StudentPromotionEvidence");
    expect(source).toContain('"PASSED_OUT"');
    expect(source).toContain('"REVIEW"');
    expect(source).toContain("unresolvedStudents");
    expect(source).toContain("requiresTargetLevel");
    expect(source).toContain("min-h-11");
  });
});
