import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("semester users workspace", () => {
  it("is routed from the semester dashboard", async () => {
    const [app, dashboard] = await Promise.all([
      readFile(new URL("../../App.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../lib/dashboard.ts", import.meta.url), "utf8"),
    ]);
    expect(app).toContain('dashboard/users"');
    expect(app).toContain("<SemesterUsers");
    expect(app).toContain('<ProtectedRoute requireAdmin>\n                      <SemesterUsers');
    expect(dashboard).toContain('"Semester users"');
  });

  it("manages roles and exact-date remuneration with mobile-safe controls", async () => {
    const source = await readFile(
      new URL("../../pages/semesters/SemesterUsers.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("Daily remuneration");
    expect(source).toContain("Effective from");
    expect(source).toContain('type="date"');
    expect(source).toContain("Remuneration schedule");
    expect(source).toContain("min-h-11");
    expect(source).toContain("const roleError");
    expect(source).toContain("Choose a teaching level for every educator role.");
    expect(source).toMatch(
      /<SemesterLevelSelect[\s\S]*?required[\s\S]*?label="Teaching level"/,
    );
    expect(source).toContain(
      "disabled={Boolean(roleError || updateAssignments.isPending)}",
    );
    expect(source).not.toContain("Daily rate");
  });
});
