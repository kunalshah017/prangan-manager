import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const clientFile = (path: string) =>
  new URL(`../../${path}`, import.meta.url);

describe("semester transition client wiring", () => {
  it("routes draft semester setup and redirects creation to it", async () => {
    const [app, create, hooks, types] = await Promise.all([
      readFile(clientFile("App.tsx"), "utf8"),
      readFile(clientFile("pages/semesters/CreateSemester.tsx"), "utf8"),
      readFile(clientFile("hooks/useSemesterTransitionQueries.ts"), "utf8"),
      readFile(clientFile("types/api.ts"), "utf8"),
    ]);

    expect(app).toContain("SemesterSetup");
    expect(app).toContain("semesters/:semesterId/setup");
    expect(create).toContain("sourceSemesterId");
    expect(create).toMatch(/navigate\([^)]*setup/);
    expect(hooks).toContain("/setup/students");
    expect(hooks).toContain("/setup/staff");
    expect(hooks).toContain("/setup/activate");
    expect(types).toContain('"DRAFT" | "ACTIVE" | "ARCHIVED"');
    expect(types).toContain("SemesterTransition");
  });

  it("uses the correctly spelled remuneration route with legacy compatibility", async () => {
    const app = await readFile(clientFile("App.tsx"), "utf8");
    expect(app).toContain("attendance/remuneration");
    expect(app).toContain("attendance/renumeration");
    expect(app).toContain("<Navigate");
  });
});
