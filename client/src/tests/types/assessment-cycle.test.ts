import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("assessment cycle API types", () => {
  it("shares canonical assessment cycles across exams and curriculum", () => {
    const examTypes = readFileSync(
      new URL("../../types/exam.ts", import.meta.url),
      "utf8",
    );
    const apiTypes = readFileSync(
      new URL("../../types/api.ts", import.meta.url),
      "utf8",
    );

    expect(examTypes).toContain(
      'import type { AssessmentCycle } from "./api";',
    );
    expect(examTypes).toContain(
      'export type { AssessmentCycle } from "./api";',
    );
    expect(examTypes).not.toContain("ExamCycle");
    expect(examTypes).toMatch(/cycle: AssessmentCycle;/);

    expect(apiTypes).toContain(
      'export type AssessmentCycle = "PRE_ASSESSMENT" | "SA_1" | "SA_2" | "SA_3";',
    );
    expect(apiTypes).toMatch(
      /export type CurriculumAssessmentCycle = Exclude<\s*AssessmentCycle,\s*"PRE_ASSESSMENT"\s*>;/,
    );
    expect(apiTypes).toMatch(
      /interface SyllabusTopic[\s\S]*?cycle: CurriculumAssessmentCycle;/,
    );
    expect(apiTypes).toMatch(
      /interface CreateSyllabusTopicRequest[\s\S]*?cycle: CurriculumAssessmentCycle;/,
    );
    expect(apiTypes).toMatch(
      /interface UpdateSyllabusTopicRequest[\s\S]*?cycle\?: CurriculumAssessmentCycle;/,
    );
    expect(apiTypes).not.toMatch(/cycle\?: string;/);
  });
});
