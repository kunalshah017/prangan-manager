import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cycleHelperPath = new URL(
  "../../lib/assessment-cycle.ts",
  import.meta.url,
);
const marksFieldsPath = new URL(
  "../../components/exams/LsrwMarksFields.tsx",
  import.meta.url,
);
const topicEditorPath = new URL(
  "../../components/syllabus/TopicEditor.tsx",
  import.meta.url,
);

describe("assessment cycle UI primitives", () => {
  it("provides canonical labels, complete exam options, and SA-only curriculum options", async () => {
    expect(existsSync(cycleHelperPath)).toBe(true);
    if (!existsSync(cycleHelperPath)) return;

    const cycles = await import("../../lib/assessment-cycle");

    expect(cycles.assessmentCycleOptions).toEqual([
      { value: "PRE_ASSESSMENT", label: "Pre-Assessment" },
      { value: "SA_1", label: "SA-1" },
      { value: "SA_2", label: "SA-2" },
      { value: "SA_3", label: "SA-3" },
    ]);
    expect(cycles.curriculumAssessmentCycleOptions).toEqual(
      cycles.assessmentCycleOptions.slice(1),
    );
    expect(cycles.getAssessmentCycleLabel("SA_2")).toBe("SA-2");
    expect(cycles.isAssessmentCycle("PRE_ASSESSMENT")).toBe(true);
    expect(cycles.isAssessmentCycle("SA-2")).toBe(false);
    expect(cycles.isAssessmentCycle("toString")).toBe(false);
    expect(cycles.isCurriculumAssessmentCycle("SA_3")).toBe(true);
    expect(cycles.isCurriculumAssessmentCycle("PRE_ASSESSMENT")).toBe(false);
  });

  it("defines accessible controlled LSRW maximum-mark fields with a live total", () => {
    expect(existsSync(marksFieldsPath)).toBe(true);
    if (!existsSync(marksFieldsPath)) return;

    const source = readFileSync(marksFieldsPath, "utf8");

    for (const label of ["Listening", "Speaking", "Reading", "Writing"]) {
      expect(source).toContain(`label: "${label}"`);
    }
    expect(source).toContain('type="number"');
    expect(source).toContain("min={0}");
    expect(source).toContain("min-h-11");
    expect(source).toContain("onChange(field.name");
    expect(source).toContain("<output");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Total maximum marks");
    expect(source).toContain("border-input");
  });

  it("defines a controlled typed topic hierarchy with accessible cycle and icon controls", () => {
    expect(existsSync(topicEditorPath)).toBe(true);
    if (!existsSync(topicEditorPath)) return;

    const source = readFileSync(topicEditorPath, "utf8");

    expect(source).toContain("export interface TopicEditorTopic");
    expect(source).toContain("export interface TopicEditorSubtopic");
    expect(source).toContain("CurriculumAssessmentCycle");
    expect(source).toContain("curriculumAssessmentCycleOptions");
    expect(source).toContain("onChange(nextTopics)");
    expect(source).toContain("min-h-11");
    expect(source).toContain("aria-expanded");
    expect(source).toContain("aria-controls");
    expect(source).toContain("label={`Remove topic");
    expect(source).toContain("label={`Remove subtopic");
    expect(source).toContain("subtopics: topic.subtopics.map");
    expect(source).toContain("getAssessmentCycleLabel(topic.cycle)");
    expect(source).toContain("<Plus");
    expect(source).toContain("<Trash2");
    expect(source).toContain("<ChevronDown");
    expect(source).toContain("<ChevronRight");
    expect(source).not.toContain("PRE_ASSESSMENT");
  });

  it("keeps nearby exam and syllabus pages on the shared cycle source", () => {
    const examSources = [
      "../../pages/exams/CreateExam.tsx",
      "../../pages/exams/EditExam.tsx",
      "../../pages/exams/ExamManagement.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    const syllabusSources = [
      "../../pages/syllabus/CreateSyllabus.tsx",
      "../../pages/syllabus/EditSyllabus.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    expect(examSources[0]).toContain("assessmentCycleOptions.map");
    expect(examSources[1]).toContain("assessmentCycleOptions.map");
    expect(examSources[2]).toContain("getAssessmentCycleLabel");
    expect(examSources[2]).not.toContain("const getCycleDisplay");

    for (const source of syllabusSources) {
      expect(source).toContain("<TopicEditor");
      expect(source).not.toContain("const curriculumCycles");
    }
  });
});
