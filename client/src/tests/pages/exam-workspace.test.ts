import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const readExamPage = (name: string) =>
  readFile(new URL(`../../pages/exams/${name}`, import.meta.url), "utf8");

describe("exam workspace redesign", () => {
  it("uses the shared workspace frame and local query recovery on every route", async () => {
    const pages = await Promise.all(
      [
        "ExamManagement.tsx",
        "CreateExam.tsx",
        "EditExam.tsx",
        "ExamScores.tsx",
      ].map(readExamPage),
    );

    for (const source of pages) {
      expect(source).toContain("WorkspacePage");
      expect(source).toContain("WorkspacePageHeader");
      expect(source).toContain("Try again");
      expect(source).toContain("min-h-11");
      expect(source).not.toMatch(/text-gray-|bg-gray-|border-gray-|orange-/);
      expect(source).not.toContain("text-[10px]");
    }
  });

  it("shares canonical assessment and LSRW form composition", async () => {
    const [create, edit, form] = await Promise.all([
      readExamPage("CreateExam.tsx"),
      readExamPage("EditExam.tsx"),
      readExamPage("ExamForm.tsx"),
    ]);

    expect(create).toContain("ExamForm");
    expect(edit).toContain("ExamForm");
    expect(form).toContain("assessmentCycleOptions");
    expect(form).toContain("getAssessmentCycleLabel");
    expect(form).toContain("LsrwMarksFields");
    expect(form).toContain("WeekendDatePicker");
    expect(form).toContain('label="Exam date"');
    expect(form).not.toContain('type="date"');
    expect(form).toContain("semester.startDate");
    expect(form).toContain("semester.endDate");
    expect(form).toContain("Saturday or Sunday");
    expect(form).toContain(
      'const isPreAssessment = value.cycle === "PRE_ASSESSMENT"',
    );
    expect(form).toContain("min={isPreAssessment ? undefined");
    expect(form).toContain("max={isPreAssessment ? undefined");
    expect(form).not.toContain("Saturday or Sunday between");
  });

  it("opens the weekend calendar as an overlay without shifting the form", async () => {
    const picker = await readFile(
      new URL(
        "../../components/students/WeekendDatePicker.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(picker).toContain("min?: string");
    expect(picker).toContain("max?: string");
    expect(picker).toContain("relative min-w-0");
    expect(picker).toContain("absolute right-0 top-full z-50");
  });

  it("uses 5/5/5/35 defaults and generates the exam name from selected context", async () => {
    const [create, form] = await Promise.all([
      readExamPage("CreateExam.tsx"),
      readExamPage("ExamForm.tsx"),
    ]);

    expect(create).toContain("listeningMaxMarks: 5");
    expect(create).toContain("speakingMaxMarks: 5");
    expect(create).toContain("readingMaxMarks: 5");
    expect(create).toContain("writingMaxMarks: 35");
    expect(form).toContain("const generatedName = buildExamName(");
    expect(form).toContain("getAssessmentCycleLabel(cycle)");
    expect(form).toContain("semester.name");
    expect(form).toContain("value={generatedName}");
    expect(form).toContain("readOnly");
    expect(form).toContain("name: generatedName");
  });

  it("provides useful management filters, summary, and permission-aware actions", async () => {
    const source = await readExamPage("ExamManagement.tsx");

    expect(source).toContain("assessmentCycleOptions");
    expect(source).toContain("Search exams");
    expect(source).toContain("Date range");
    expect(source).toContain("Active exams");
    expect(source).toContain("Inactive exams");
    expect(source).toContain("hasManagePermission");
    expect(source).toContain("isAdmin");
    expect(source).toContain("educatorLevel");
    expect(source).toContain(
      "...(educatorLevel ? { level: educatorLevel } : {})",
    );
    expect(source).toContain("aria-label={`Edit ${exam.name}`}");
  });

  it("does not issue score queries before score read access is established", async () => {
    const [scores, hooks] = await Promise.all([
      readExamPage("ExamScores.tsx"),
      readFile(
        new URL("../../hooks/useExamQueries.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(scores).toContain('can(user, "scores.read"');
    expect(scores).toContain("enabled: canReadScores");
    expect(hooks).toContain("options?: { enabled?: boolean }");
    expect(hooks).toContain("options?.enabled ?? !!examId");
    expect(hooks).toContain("filters?.enabled ??");
  });

  it("uses accessible score editing, completion filters, statistics, and returned IDs", async () => {
    const source = await readExamPage("ExamScores.tsx");

    expect(source).toContain("<Modal");
    expect(source).toContain("Search students");
    expect(source).toContain("Pending scores");
    expect(source).toContain("Completed scores");
    expect(source).toContain("Absent students");
    expect(source).toContain("stats.totalStudents");
    expect(source).toContain("stats.scoresEntered");
    expect(source).toContain("stats.pendingScores");
    expect(source).toContain("stats.absentStudents");
    expect(source).toContain(
      "const createdScores = await bulkCreateMutation.mutateAsync",
    );
    expect(source).toContain("existingScoreId: createdScores[0]?.id");
    expect(source).toContain(
      "const updatedScore = await updateScoreMutation.mutateAsync",
    );
    expect(source).toContain("listeningScore: updatedScore.listeningScore");
    expect(source).toContain("records all four skill scores as zero");
    expect(source).toContain("canEditScores");
  });

  it("builds the score roster from active semester enrollments instead of attendance", async () => {
    const source = await readExamPage("ExamScores.tsx");

    expect(source).toContain("useStudentEnrollmentsBySemester");
    expect(source).toContain("enrollment.isActive");
    expect(source).toContain(
      "enrollment.semesterLevelId === exam.semesterLevelId",
    );
    expect(source).not.toContain("useStudentAttendanceRecords");
    expect(source).not.toContain("attendanceQuery");
  });

  it("uses semester membership IDs and managed names across exam workflows", async () => {
    const [form, create, edit, management, scores, hooks] = await Promise.all([
      readExamPage("ExamForm.tsx"),
      readExamPage("CreateExam.tsx"),
      readExamPage("EditExam.tsx"),
      readExamPage("ExamManagement.tsx"),
      readExamPage("ExamScores.tsx"),
      readFile(
        new URL("../../hooks/useExamQueries.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(form).toContain("SemesterLevelSelect");
    expect(form).toContain("levelName(");
    expect(create).toContain("semesterLevelId");
    expect(edit).toContain("includeInactiveCurrent");
    expect(management).toContain("useSemesterLevels(semesterId");
    expect(management).toContain("semesterLevelId");
    expect(scores).toContain("exam.semesterLevelId");
    expect(hooks).toContain(
      'params.append("semesterLevelId", filters.semesterLevelId)',
    );

    for (const source of [form, create, edit, management, scores]) {
      expect(source).not.toMatch(/LEVEL_[1-4]|PRIMARY_[AB]/);
    }
  });
});
