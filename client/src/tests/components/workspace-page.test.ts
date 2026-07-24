import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const framePath = new URL(
  "../../components/workspace/WorkspacePage.tsx",
  import.meta.url,
);

describe("workspace page frame", () => {
  it("owns the shared content origin for dashboard and student routes", () => {
    expect(existsSync(framePath)).toBe(true);
    if (!existsSync(framePath)) return;

    const frame = readFileSync(framePath, "utf8");
    const dashboard = readFileSync(
      new URL("../../pages/semesters/Dashboard.tsx", import.meta.url),
      "utf8",
    );
    const students = readFileSync(
      new URL("../../pages/students/Students.tsx", import.meta.url),
      "utf8",
    );
    const studentForm = readFileSync(
      new URL(
        "../../components/students/StudentFormLayout.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const createStudent = readFileSync(
      new URL("../../pages/students/CreateStudent.tsx", import.meta.url),
      "utf8",
    );
    const editStudent = readFileSync(
      new URL("../../pages/students/EditStudent.tsx", import.meta.url),
      "utf8",
    );

    expect(frame).toContain("max-w-6xl");
    expect(frame).toContain("pb-8");
    expect(frame).toContain("<DoodleBackground");

    expect(frame).toContain("export function WorkspacePageHeader");

    for (const source of [dashboard, students, studentForm]) {
      expect(source).toContain("<WorkspacePageHeader");
    }

    for (const source of [dashboard, students, createStudent, editStudent]) {
      expect(source).toContain("<WorkspacePage");
      expect(source).not.toContain("py-2 sm:py-4");
    }

    expect(studentForm).not.toMatch(/<WorkspacePage(?:\s|>)/);
    expect(dashboard).not.toContain("dashboardModel.roleLabel}</p>");
  });
});
