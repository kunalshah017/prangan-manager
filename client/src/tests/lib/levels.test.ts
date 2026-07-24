import { describe, expect, it } from "vitest";

import { levelCode, levelName, sortByJourneyOrder } from "@/lib/levels";
import type { AcademicLevel, SemesterLevel } from "@/types/api";

const academicLevel = (
  overrides: Partial<AcademicLevel> = {},
): AcademicLevel => ({
  id: "level-1",
  code: "PRIMARY_A",
  name: "Primary A",
  journeyOrder: 200,
  isActive: true,
  ...overrides,
});

const semesterLevel = (
  level: AcademicLevel = academicLevel(),
): SemesterLevel => ({
  id: `semester-${level.id}`,
  semesterId: "semester-1",
  academicLevelId: level.id,
  isActive: true,
  academicLevel: level,
});

describe("managed level helpers", () => {
  it("reads names and codes from catalog and semester levels", () => {
    expect(levelName(academicLevel())).toBe("Primary A");
    expect(levelName(semesterLevel())).toBe("Primary A");
    expect(levelCode(academicLevel())).toBe("PRIMARY_A");
    expect(levelCode(semesterLevel())).toBe("PRIMARY_A");
  });

  it("uses an optional legacy level when no managed level is available", () => {
    expect(levelName(undefined, "LEVEL_1")).toBe("Level 1");
    expect(levelCode(undefined, "LEVEL_1")).toBe("LEVEL_1");
    expect(levelName(undefined)).toBe("");
    expect(levelCode(undefined)).toBe("");
  });

  it("sorts catalog and semester levels by journey order without mutation", () => {
    const first = academicLevel({
      id: "level-first",
      journeyOrder: 100,
    });
    const second = academicLevel({
      id: "level-second",
      journeyOrder: 200,
    });
    const source = [semesterLevel(second), semesterLevel(first)];

    expect(sortByJourneyOrder(source).map((level) => level.id)).toEqual([
      "semester-level-first",
      "semester-level-second",
    ]);
    expect(source.map((level) => level.id)).toEqual([
      "semester-level-second",
      "semester-level-first",
    ]);
  });
});
