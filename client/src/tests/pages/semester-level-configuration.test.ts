import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const createSource = readFileSync(
  new URL("../../pages/semesters/CreateSemester.tsx", import.meta.url),
  "utf8",
);
const editSource = readFileSync(
  new URL("../../pages/semesters/EditSemester.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../../components/semesters/SemesterFormLayout.tsx", import.meta.url),
  "utf8",
);

describe("semester academic level configuration", () => {
  it("defaults creation to every active catalog level and submits memberships", () => {
    expect(createSource).toContain("useAcademicLevels()");
    expect(createSource).toContain(
      "setAcademicLevelIds(levels.map((level) => level.id))",
    );
    expect(createSource).toContain("academicLevelIds.length === 0");
    expect(createSource).toContain("Select at least one academic level.");
    expect(createSource).toContain("academicLevelIds,");
    expect(createSource).toContain("sourceSemesterId");
  });

  it("loads existing memberships including archived levels and submits replacements", () => {
    expect(editSource).toContain(
      "useAcademicLevels({ includeArchived: true })",
    );
    expect(editSource).toContain(
      'useSemesterLevels(id || "", { includeInactive: true })',
    );
    expect(editSource).toContain(
      "setAcademicLevelIds(levels.map((level) => level.academicLevelId))",
    );
    expect(editSource).toContain("membershipIds.has(level.id)");
    expect(editSource).toContain("academicLevelIds.length === 0");
    expect(editSource).toContain("academicLevelIds };");
  });

  it("renders an ordered, responsive, accessible checkbox group", () => {
    expect(layoutSource).toContain("Academic levels");
    expect(layoutSource).toContain("sortByJourneyOrder");
    expect(layoutSource).toContain('role="group"');
    expect(layoutSource).toContain('type="checkbox"');
    expect(layoutSource).toContain("grid gap-3 sm:grid-cols-2");
    expect(layoutSource).toContain("Archived");
    expect(layoutSource).toContain("academicLevelError");
  });
});
