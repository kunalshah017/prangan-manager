import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildNavigationModel } from "@/lib/navigation";
import type { User } from "@/types/api";

const pagePath = new URL(
  "../../pages/levels/AcademicLevels.tsx",
  import.meta.url,
);
const editorPath = new URL(
  "../../components/levels/AcademicLevelEditor.tsx",
  import.meta.url,
);
const appSource = readFileSync(
  new URL("../../App.tsx", import.meta.url),
  "utf8",
);

const admin: User = {
  id: "admin-1",
  name: "Admin",
  firstName: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  status: "APPROVED",
  roleAssignments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("managed academic levels administration", () => {
  it("adds an admin-only Levels destination and lazy route", () => {
    const model = buildNavigationModel(admin);
    expect(model.administration).toContainEqual({
      label: "Levels",
      href: "/academic-levels",
      icon: "layers",
    });
    expect(appSource).toContain("pages/levels/AcademicLevels");
    expect(appSource).toMatch(
      /path="\/academic-levels"[\s\S]*?<ProtectedRoute requireAdmin>[\s\S]*?<AcademicLevels \/>/,
    );
  });

  it("provides an accessible catalog editor with create, rename, archive, restore, and reorder controls", () => {
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(editorPath)).toBe(true);
    if (!existsSync(pagePath) || !existsSync(editorPath)) return;

    const pageSource = readFileSync(pagePath, "utf8");
    const editorSource = readFileSync(editorPath, "utf8");

    expect(pageSource).toContain("WorkspacePage");
    expect(pageSource).toContain(
      "useAcademicLevels({ includeArchived: true })",
    );
    expect(pageSource).toContain("ConfirmationModal");
    expect(pageSource).toContain("Try again");
    expect(pageSource).toContain("No academic levels yet");
    expect(pageSource).toContain("existing semesters");
    expect(pageSource).toContain("new semesters");

    expect(editorSource).toContain("normalizeLevelCode");
    expect(editorSource).toContain("Code cannot be changed after creation");
    expect(editorSource).toContain("aria-label={`Move ${level.name} up`}");
    expect(editorSource).toContain("aria-label={`Move ${level.name} down`}");
    expect(editorSource).toContain("Archive");
    expect(editorSource).toContain("Restore");
  });
});
