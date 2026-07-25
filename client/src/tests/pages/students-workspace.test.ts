import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const students = readFileSync(
  new URL("../../pages/students/Students.tsx", import.meta.url),
  "utf8",
);
const formPath = new URL(
  "../../components/students/StudentFormLayout.tsx",
  import.meta.url,
);
const create = readFileSync(
  new URL("../../pages/students/CreateStudent.tsx", import.meta.url),
  "utf8",
);
const edit = readFileSync(
  new URL("../../pages/students/EditStudent.tsx", import.meta.url),
  "utf8",
);
const enrollment = readFileSync(
  new URL("../../components/EnrollmentManager.tsx", import.meta.url),
  "utf8",
);
const roleAssignment = readFileSync(
  new URL("../../components/ui/role-assignment-form.tsx", import.meta.url),
  "utf8",
);

describe("Students workspace", () => {
  it("uses one scan-friendly roster with reusable completion logic", () => {
    expect(students).toContain("getMissingStudentDetails");
    expect(students).toContain("getStudentProfileCompletion");
    expect(students).toContain("[...(students || [])]");
    expect(students).toContain("levelFilter");
    expect(students).toContain("Profile completeness");
    expect(students).toContain('aria-live="polite"');
    expect(students).not.toContain("getPendingDetailsForStudent");
    expect(students).not.toContain("motion.div");
  });

  it("shows profile completion only when details are missing", () => {
    expect(students).toContain("missing.length > 0 && (");
    expect(students).not.toContain(
      'completion === 100 ? "bg-success/10 text-success"',
    );
    expect(students).not.toContain(': "Complete"');
  });

  it("provides semantic contact and permission-gated edit actions", () => {
    expect(students).toContain("function CallAction");
    expect(students).toContain(
      "student.phoneNumber && student.alternateNumber",
    );
    expect(students).toContain("<summary");
    expect(students).toContain("Choose a number");
    expect(students).toContain("ChevronDown");
    expect(students).toContain("href={`tel:${student.phoneNumber}`}");
    expect(students).toContain("href={`tel:${student.alternateNumber}`}");
    expect(students).toContain("Primary number");
    expect(students).toContain("Alternate number");
    expect(students).toContain("https://wa.me/");
    expect(students).toContain("aria-label={`Edit ${student.name}`}");
    expect(students).toContain('permission="students.manage"');
    expect(students).toContain("min-h-11");
    expect(students).not.toContain("window.open(`tel:");
  });

  it("shares one sectioned Create/Edit student form", () => {
    expect(existsSync(formPath)).toBe(true);
    expect(create).toContain("<StudentFormLayout");
    expect(edit).toContain("<StudentFormLayout");
    expect(create).not.toContain("motion.div");
    expect(edit).not.toContain("motion.div");
    if (!existsSync(formPath)) return;

    const form = readFileSync(formPath, "utf8");
    for (const token of [
      "Profile photo",
      "Student identity",
      "Contact details",
      "Family and education",
      "Future aspiration",
      "lg:sticky lg:bottom-3",
      "PersonNameFields",
      "ImageUpload",
      "min-h-11",
    ]) {
      expect(form).toContain(token);
    }
    expect(form.indexOf("Profile photo")).toBeLessThan(
      form.indexOf("Student identity"),
    );
    expect(form.indexOf("student-photo-heading")).toBeLessThan(
      form.indexOf("<ImageUpload"),
    );
    expect(form).not.toContain("Student record");
    expect(form).not.toContain("student-record-heading");
    expect(form).not.toContain("lg:grid-cols-[minmax(0,1fr)_20rem]");
    expect(form).toMatch(/id="student-level"[\s\S]*?required/);
    expect(form).not.toContain('label=""');
    expect(form).toContain("errors.level &&");
  });

  it("keeps enrollment history responsive and visually consistent", () => {
    expect(enrollment).toContain("bg-card");
    expect(enrollment).toContain("border-border");
    expect(enrollment).toContain("text-muted-foreground");
    expect(enrollment).toContain("min-h-11");
    expect(enrollment).toContain("flex-col gap-3 sm:flex-row");
    expect(enrollment).not.toContain("bg-orange-100");
    expect(enrollment).not.toContain("bg-green-50 border-green-200");
    expect(enrollment).not.toContain("bg-orange-50");
    expect(enrollment).not.toContain("bg-gray-50");
    expect(enrollment).toContain("bg-destructive/5");
    expect(enrollment).toMatch(/flex flex-col-reverse gap-3[^"]*sm:flex-row/);
  });

  it("uses semester memberships for student and educator level selection", () => {
    const form = readFileSync(formPath, "utf8");

    expect(form).toContain("SemesterLevelSelect");
    expect(form).toContain("semesterId={semesterId}");
    expect(create).toContain("semesterLevelId");
    expect(create).toContain(
      "enrollment: { projectId, centerId, semesterId, semesterLevelId }",
    );
    expect(enrollment).toContain("SemesterLevelSelect");
    expect(enrollment).toContain("semesterLevelId");
    expect(roleAssignment).toContain("SemesterLevelSelect");
    expect(roleAssignment).toContain("assignment.semesterLevelId");
    expect(roleAssignment).toContain("delete assignment.semesterLevelId");

    for (const source of [form, create, enrollment, roleAssignment]) {
      expect(source).not.toMatch(
        /const (?:LEVELS|levelOptions|studentLevelOptions)\s*=/,
      );
    }
  });

  it("filters and sorts the roster by managed membership metadata", () => {
    expect(students).toContain("useSemesterLevels(semesterId");
    expect(students).toContain("semesterLevelId");
    expect(students).toContain("journeyOrder");
    expect(students).toContain("levelName(");
    expect(students).not.toMatch(/const levelOrder\s*=/);
  });
});
