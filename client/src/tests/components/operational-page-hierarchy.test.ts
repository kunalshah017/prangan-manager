import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const projectsSource = read("../../pages/projects/Projects.tsx");
const projectFormSource = read(
  "../../components/projects/ProjectFormLayout.tsx",
);
const centerFormSource = read("../../components/centers/CenterFormLayout.tsx");
describe("operational page hierarchy", () => {
  it("uses breadcrumbs instead of duplicate local hierarchy controls", () => {
    expect(projectsSource).not.toMatch(/>\s*Workspace\s*</);
    expect(projectFormSource).not.toContain("Back to projects");
    expect(projectFormSource).not.toContain("Project administration");
    expect(centerFormSource).not.toContain("Back to centers");
    expect(centerFormSource).not.toContain("Center administration");
  });

  it("shows page titles in the top bar instead of in-page headings", () => {
    expect(projectsSource).toContain('<PageTitle title="Projects" />');
    expect(projectsSource).not.toContain("<h1");
    expect(projectFormSource).toContain("<PageTitle");
    expect(projectFormSource).not.toContain("<h1");
    expect(centerFormSource).not.toContain("<h1");
  });
});
