import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFile(new URL(`../../pages/${path}`, import.meta.url), "utf8");

describe("shared back navigation", () => {
  it("does not duplicate the shared rail in workspace page headers", async () => {
    const [centers, semesters, userDetails, editUser, examScores] =
      await Promise.all([
        source("centers/Centers.tsx"),
        source("semesters/Semesters.tsx"),
        source("users/UserDetails.tsx"),
        source("users/EditUser.tsx"),
        source("exams/ExamScores.tsx"),
      ]);

    expect(centers).not.toContain('aria-label="Back to project dashboard"');
    expect(semesters).not.toContain('aria-label="Back to center dashboard"');
    expect(userDetails.match(/<ArrowLeft/g)).toHaveLength(1);
    expect(editUser.match(/<ArrowLeft/g)).toHaveLength(1);
    expect(examScores).not.toContain("navigate(-1)");
  });

  it("keeps curriculum recovery actions but removes duplicate header actions", async () => {
    const [create, edit, progress] = await Promise.all([
      source("syllabus/CreateSyllabus.tsx"),
      source("syllabus/EditSyllabus.tsx"),
      source("syllabus/SyllabusProgress.tsx"),
    ]);

    expect(create.match(/Back to curriculum/g)).toHaveLength(1);
    expect(edit.match(/Back to curriculum/g)).toHaveLength(2);
    expect(progress.match(/Back to curriculum/g)).toHaveLength(2);
  });
});
