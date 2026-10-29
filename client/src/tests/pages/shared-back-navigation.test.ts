import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFile(new URL(`../../pages/${path}`, import.meta.url), "utf8");

describe("shared back navigation", () => {
  it("does not duplicate the shared rail in workspace page headers", async () => {
    const [userDetails, editUser, examScores] =
      await Promise.all([
        source("users/UserDetails.tsx"),
        source("users/EditUser.tsx"),
        source("exams/ExamScores.tsx"),
      ]);

    // Recovery goes through the shared error state, not a duplicate back rail.
    expect(userDetails).not.toContain("<ArrowLeft");
    expect(userDetails).toContain('backHref="/users"');
    expect(editUser).not.toContain("<ArrowLeft");
    expect(editUser).toContain('backHref="/users"');
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
