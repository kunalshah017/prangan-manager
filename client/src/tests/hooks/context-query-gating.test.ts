import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("context query gating", () => {
  it("lets workspace pages prevent contextual requests when the typed policy denies access", async () => {
    const studentHooks = await readFile(
      new URL("../../hooks/useStudentQueries.ts", import.meta.url),
      "utf8",
    );
    const attendanceHooks = await readFile(
      new URL("../../hooks/useStudentAttendanceQueries.ts", import.meta.url),
      "utf8",
    );
    const studentsPage = await readFile(
      new URL("../../pages/students/Students.tsx", import.meta.url),
      "utf8",
    );
    const markAttendancePage = await readFile(
      new URL(
        "../../pages/student-attendance/MarkStudentAttendance.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const examHooks = await readFile(
      new URL("../../hooks/useExamQueries.ts", import.meta.url),
      "utf8",
    );
    const syllabusHooks = await readFile(
      new URL("../../hooks/useSyllabusQueries.ts", import.meta.url),
      "utf8",
    );
    const examsPage = await readFile(
      new URL("../../pages/exams/ExamManagement.tsx", import.meta.url),
      "utf8",
    );
    const syllabusPage = await readFile(
      new URL("../../pages/syllabus/SyllabusManagement.tsx", import.meta.url),
      "utf8",
    );

    expect(studentHooks).toContain("options?.enabled ?? !!semesterId");
    expect(attendanceHooks).toContain("options?.enabled ?? !!semesterId");
    expect(studentsPage).toMatch(/can\(user, ["']students\.read["']/);
    expect(studentsPage).toContain("{ enabled: canReadStudents }");
    expect(markAttendancePage).toContain("can(user, 'studentAttendance.write'");
    expect(markAttendancePage).toContain("{ enabled: canWriteAttendance }");
    expect(examHooks).toContain("filters?.enabled ??");
    expect(syllabusHooks).toContain("filters?.enabled ??");
    expect(examsPage).toMatch(/can\(user, ["']exams\.read["']/);
    expect(examsPage).toContain("enabled: canReadExams");
    expect(syllabusPage).toMatch(/can\(user, ["']curriculum\.read["']/);
    expect(syllabusPage).toContain("enabled: canReadCurriculum");
  });
});
