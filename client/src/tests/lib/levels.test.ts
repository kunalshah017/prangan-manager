import { describe, expect, it } from "vitest";

import {
  levelCode,
  levelName,
  sortByJourneyOrder,
  sortByJourneyOrderThenName,
} from "@/lib/levels";
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

  it("returns an empty label and code when managed metadata is unavailable", () => {
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

  it("sorts records by current level sequence, then name, with unmapped records last", () => {
    const primary = academicLevel({ id: "primary", journeyOrder: 100 });
    const secondary = academicLevel({ id: "secondary", journeyOrder: 200 });
    const source = [
      { id: "unmapped", name: "Aarav", level: null },
      { id: "secondary", name: "Aditi", level: secondary },
      { id: "primary-z", name: "Zoya", level: primary },
      { id: "primary-a", name: "Anaya", level: primary },
    ];

    expect(
      sortByJourneyOrderThenName(
        source,
        (record) => record.level,
        (record) => record.name,
      ).map((record) => record.id),
    ).toEqual(["primary-a", "primary-z", "secondary", "unmapped"]);
    expect(source.map((record) => record.id)).toEqual([
      "unmapped",
      "secondary",
      "primary-z",
      "primary-a",
    ]);
  });
});
