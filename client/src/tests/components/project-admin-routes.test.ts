import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

describe("project administration routes", () => {
  it("guards create and edit at the router boundary", () => {
    expect(source).toMatch(
      /path="new"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<CreateProject \/>/,
    );
    expect(source).toMatch(
      /path=":id\/edit"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<EditProject \/>/,
    );
  });

  it("guards center create and edit at the router boundary", () => {
    expect(source).toMatch(
      /path=":projectId\/centers\/new"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<CreateCenter \/>/,
    );
    expect(source).toMatch(
      /path=":projectId\/centers\/:id\/edit"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<EditCenter \/>/,
    );
  });

  it("guards semester create and edit at the router boundary", () => {
    expect(source).toMatch(
      /path=":projectId\/centers\/:centerId\/semesters\/new"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<CreateSemester \/>/,
    );
    expect(source).toMatch(
      /path=":projectId\/centers\/:centerId\/semesters\/:id\/edit"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<EditSemester \/>/,
    );
  });
  it("guards the semester dashboard with workspace access", () => {
    expect(source).toMatch(
      /path=":projectId\/centers\/:centerId\/semesters\/:semesterId\/dashboard"[\s\S]*?<ProtectedRoute permission="workspace\.view">[\s\S]*?<Dashboard \/>/,
    );
  });
});
