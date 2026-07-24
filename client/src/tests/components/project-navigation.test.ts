import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("project navigation", () => {
  it("keeps navigation separate from lazy disclosures and exact permissions", async () => {
    const source = await readFile(
      new URL("../../components/navigation/WorkspaceTree.tsx", import.meta.url),
      "utf8",
    );
    const centerHooks = await readFile(
      new URL("../../hooks/useCenterQueries.ts", import.meta.url),
      "utf8",
    );
    const semesterHooks = await readFile(
      new URL("../../hooks/useSemesterQueries.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("aria-expanded={expanded}");
    expect(source).toContain("Expand");
    expect(source).toContain("/semesters`}");
    expect(source).toContain("allowedCenters");
    expect(source).toContain("allowedSemesters");
    expect(source).toContain("can(user, 'workspace.view'");
    expect(source).toContain("useCentersByProject(project.id, expanded)");
    expect(source).toContain("useSemestersByCenter(center.id, expanded)");
    expect(source).toContain("setExpanded(true)");
    expect(source).not.toContain("open || isCurrent");
    expect(source).not.toContain("students");
    expect(source).not.toMatch(/[📁📍📅👥]/u);
    expect(centerHooks).toContain("enabled: !!projectId && enabled");
    expect(semesterHooks).toContain("enabled: !!centerId && enabled");
  });
});
