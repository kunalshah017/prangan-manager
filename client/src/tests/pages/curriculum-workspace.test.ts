import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const readSyllabusPage = (name: string) =>
  readFile(new URL(`../../pages/syllabus/${name}`, import.meta.url), "utf8");

describe("curriculum workspace redesign", () => {
  it("uses the shared workspace frame and local query recovery on every data page", async () => {
    const pages = await Promise.all([
      readSyllabusPage("SyllabusManagement.tsx"),
      readSyllabusPage("EditSyllabus.tsx"),
      readSyllabusPage("SyllabusProgress.tsx"),
    ]);

    for (const source of pages) {
      expect(source).toContain("WorkspacePage");
      expect(source).toContain("WorkspacePageHeader");
      expect(source).toContain("Try again");
      expect(source).toContain("refetch");
    }
  });

  it("shares TopicEditor across create and edit and creates new topics in bulk", async () => {
    const [create, edit] = await Promise.all([
      readSyllabusPage("CreateSyllabus.tsx"),
      readSyllabusPage("EditSyllabus.tsx"),
    ]);

    for (const source of [create, edit]) {
      expect(source).toContain("<TopicEditor");
      expect(source).not.toContain("createTopicsSequentially");
      expect(source).not.toContain("ChevronDown");
    }

    expect(create).toContain("useBulkCreateTopics");
    expect(create).toContain("bulkCreateTopics.mutateAsync");
    expect(create).toContain("rootIds.length !== visibleTopics.length");
    expect(edit).toContain("useBulkCreateTopics");
    expect(edit).toContain("syllabusTopicId");
    expect(edit).toContain("isModified");
    expect(edit).toContain("if (!parentId)");
  });

  it("organizes progress by the three curriculum cycles with one shared status control", async () => {
    const progress = await readSyllabusPage("SyllabusProgress.tsx");

    expect(progress).toContain("curriculumAssessmentCycleOptions");
    expect(progress).toContain("getAssessmentCycleLabel");
    expect(progress).toContain("<TopicStatusControl");
    expect(progress).toContain('role="tablist"');
    expect(progress).toContain('aria-label="Assessment cycle"');
    expect(progress).toContain("notes");
    expect(progress.match(/function TopicStatusControl/g)).toHaveLength(1);
  });

  it("does not issue curriculum detail queries before route access is established", async () => {
    const [edit, progress, hooks] = await Promise.all([
      readSyllabusPage("EditSyllabus.tsx"),
      readSyllabusPage("SyllabusProgress.tsx"),
      readFile(
        new URL("../../hooks/useSyllabusQueries.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(edit).toContain("enabled: hasEditPermission");
    expect(progress).toContain("enabled: canReadCurriculum");
    expect(hooks).toContain("enabled?: boolean");
    expect(hooks).toContain("options?.enabled ?? !!id");
    expect(hooks).toContain("filters?.enabled ?? !!filters?.syllabusId");
  });

  it("uses semester membership IDs and managed names across curriculum workflows", async () => {
    const [create, edit, management, progress, hooks] = await Promise.all([
      readSyllabusPage("CreateSyllabus.tsx"),
      readSyllabusPage("EditSyllabus.tsx"),
      readSyllabusPage("SyllabusManagement.tsx"),
      readSyllabusPage("SyllabusProgress.tsx"),
      readFile(
        new URL("../../hooks/useSyllabusQueries.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(create).toContain("SemesterLevelSelect");
    expect(create).toContain("semesterLevelId");
    expect(edit).toContain("includeInactiveCurrent");
    expect(management).toContain("useSemesterLevels(semesterId");
    expect(management).toContain("semesterLevelId");
    expect(progress).toContain("levelName(");
    expect(hooks).toContain("semesterLevelId");
    expect(hooks).toContain(
      'params.append("semesterLevelId", filters.semesterLevelId)',
    );

    for (const source of [create, edit, management, progress]) {
      expect(source).not.toMatch(/LEVEL_[1-4]|PRIMARY_[AB]/);
    }
  });

  it("keeps controls accessible and removes legacy tiny/raw page styling", async () => {
    const pages = await Promise.all([
      readSyllabusPage("SyllabusManagement.tsx"),
      readSyllabusPage("CreateSyllabus.tsx"),
      readSyllabusPage("EditSyllabus.tsx"),
      readSyllabusPage("SyllabusProgress.tsx"),
    ]);

    for (const source of pages) {
      expect(source).toContain("min-h-11");
      expect(source).toContain("focus-visible:ring-2");
      const buttons = source.match(/<button[\s\S]*?<\/button>/g) || [];
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) expect(button).toContain("min-h-11");
      expect(source).not.toMatch(
        /\b(?:bg|text|border)-(?:gray|orange|blue|green|red)-\d{2,3}\b/,
      );
      expect(source).not.toContain("DoodleBackground");
      expect(source).not.toContain("framer-motion");
    }
  });
});
