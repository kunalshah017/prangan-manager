import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("managed academic level client contracts", () => {
  it("shares managed references across operational types while retaining legacy levels", async () => {
    const types = await readFile(
      new URL("../../types/api.ts", import.meta.url),
      "utf8",
    );

    expect(types).toContain("export interface LevelReference");
    expect(types).toContain("export interface Student extends LevelReference");
    expect(types).toContain("export interface Syllabus extends LevelReference");
    expect(types).toContain("roleAssignments: (LevelReference & {");
    expect(types).toContain("roleAssignment?: LevelReference & {");
    expect(types).toContain("enrollment?: LevelReference & {");
    expect(types).toMatch(
      /interface Syllabus extends LevelReference[\s\S]*?level: Level;/,
    );
    expect(types).toContain("export type LegacyLevel = string;");
    expect(types).not.toMatch(
      /export type LegacyLevel\s*=\s*[\s\S]*?\|\s*"PRIMARY_A"/,
    );
  });

  it("uses scoped query keys, API endpoints, options, and invalidation", async () => {
    const hooks = await readFile(
      new URL("../../hooks/useAcademicLevelQueries.ts", import.meta.url),
      "utf8",
    );

    expect(hooks).toContain("queryKeys.academicLevels(includeArchived)");
    expect(hooks).toContain("/academic-levels?includeArchived=true");
    expect(hooks).toContain("api.post<");
    expect(hooks).toContain('"/academic-levels"');
    expect(hooks).toContain("api.patch<");
    expect(hooks).toContain("`/academic-levels/${id}`");
    expect(hooks).toContain("api.put<");
    expect(hooks).toContain('"/academic-levels/order"');
    expect(hooks).toContain(
      "queryKeys.semesterLevels(semesterId, includeInactive)",
    );
    expect(hooks).toContain("?includeInactive=true");
    expect(hooks).toContain("`/semesters/${semesterId}/levels`");
    expect(
      hooks.match(/return sortByJourneyOrder\(response\.levels\)/g),
    ).toHaveLength(2);
    expect(hooks).toContain("queryClient.invalidateQueries");
    expect(hooks).toContain("queryKeys.academicLevelsRoot");
    expect(hooks).toContain("queryKeys.semesterLevelsRoot(semesterId)");
  });

  it("renders accessible local states and preserves an inactive current value", async () => {
    const select = await readFile(
      new URL(
        "../../components/levels/SemesterLevelSelect.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(select).toContain("includeInactiveCurrent");
    expect(select).toContain("currentLevel");
    expect(select).toContain("useSemesterLevels(semesterId)");
    expect(select).toContain(
      "useSemesterLevels(semesterId, { includeInactive: true",
    );
    expect(select).toContain("(inactive)");
    expect(select).toMatch(/<label[^>]+htmlFor=/);
    expect(select).toContain("min-h-11");
    expect(select).toContain("Loading levels");
    expect(select).toContain("Unable to load levels");
    expect(select).toContain("No active levels available");
  });

  it("keeps operational level dropdowns scoped to their semester", async () => {
    const operationalSources = await Promise.all(
      [
        "../../components/EnrollmentManager.tsx",
        "../../components/students/StudentFormLayout.tsx",
        "../../components/ui/role-assignment-form.tsx",
        "../../pages/exams/ExamForm.tsx",
        "../../pages/exams/ExamManagement.tsx",
        "../../pages/library/Library.tsx",
        "../../pages/semesters/SemesterSetup.tsx",
        "../../pages/student-attendance/ViewStudentAttendance.tsx",
        "../../pages/students/Students.tsx",
        "../../pages/syllabus/CreateSyllabus.tsx",
        "../../pages/syllabus/SyllabusManagement.tsx",
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    );

    for (const source of operationalSources) {
      expect(source).not.toMatch(
        /<(?:option|SelectItem)[^>]*value=["'](?:PRIMARY_[A-Z]|LEVEL_\d+)["']/,
      );
      expect(source).toMatch(
        /SemesterLevelSelect|useSemesterLevels|setupQuery\.data\?\.semester\.levels/,
      );
    }
  });
});
