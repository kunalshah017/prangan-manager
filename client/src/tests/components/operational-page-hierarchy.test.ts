import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const projectsSource = read("../../pages/projects/Projects.tsx");
const centersSource = read("../../pages/centers/Centers.tsx");
const projectFormSource = read(
  "../../components/projects/ProjectFormLayout.tsx",
);
const centerFormSource = read("../../components/centers/CenterFormLayout.tsx");
describe("operational page hierarchy", () => {
  it("uses breadcrumbs instead of duplicate local hierarchy controls", () => {
    expect(projectsSource).not.toMatch(/>\s*Workspace\s*</);
    expect(centersSource).not.toContain("All projects");
    expect(centersSource).not.toMatch(/>\s*Centers workspace\s*</);
    expect(projectFormSource).not.toContain("Back to projects");
    expect(projectFormSource).not.toContain("Project administration");
    expect(centerFormSource).not.toContain("Back to centers");
    expect(centerFormSource).not.toContain("Center administration");
  });

  it("uses one concise title and project-context sentence on Centers", () => {
    expect(centersSource).toContain(
      '<h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Centers</h1>',
    );
    expect(centersSource).toContain(
      "{project.name} · Choose a center to continue to its semesters and current academic work.",
    );
    expect(centersSource).not.toContain("Centers in {project");
  });
});
