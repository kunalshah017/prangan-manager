import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const createSource = readFileSync(
  new URL("../../pages/semesters/CreateSemester.tsx", import.meta.url),
  "utf8",
);
const editSource = readFileSync(
  new URL("../../pages/semesters/EditSemester.tsx", import.meta.url),
  "utf8",
);
const layoutPath = new URL(
  "../../components/semesters/SemesterFormLayout.tsx",
  import.meta.url,
);

describe("semester create and edit forms", () => {
  it("share one responsive date form with static doodles", () => {
    expect(createSource).toContain("<SemesterFormLayout");
    expect(editSource).toContain("<SemesterFormLayout");
    expect(existsSync(layoutPath)).toBe(true);

    if (!existsSync(layoutPath)) return;
    const layoutSource = readFileSync(layoutPath, "utf8");
    expect(layoutSource).toContain("Semester details");
    expect(layoutSource).toContain("Schedule");
    expect(layoutSource).toContain("Parent center");
    expect(layoutSource).toContain("min={startDate}");
    expect(layoutSource).toContain("lg:sticky lg:bottom-3");
    expect(layoutSource).toContain("Danger zone");
    expect(layoutSource).toContain(
      "<DoodleBackground animated={false} numElements={6} />",
    );
  });

  it("validates date order and blocks a semester from another center", () => {
    expect(createSource).toContain(
      "End date must be on or after the start date.",
    );
    expect(editSource).toContain(
      "End date must be on or after the start date.",
    );
    expect(editSource).toContain(
      "semester.centerId && semester.centerId !== centerId",
    );
    expect(editSource).toContain("Semester does not belong to this center");
    expect(editSource).toContain("Enter a semester name and schedule.");
  });
});
