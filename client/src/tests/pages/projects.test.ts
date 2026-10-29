import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const source = read("../../pages/projects/Projects.tsx");
const tileSource = read("../../components/workspace/ProjectTile.tsx");
const actionSource = read("../../components/workspace/PrimaryAction.tsx");

describe("Projects workspace launcher", () => {
  it("opens a project from its tile and keeps editing a separate named action", () => {
    expect(source).toContain("href={projectCardDestination(project.id)}");
    expect(source).toContain("editHref={isAdmin() ? `/projects/${project.id}/edit` : undefined}");
    expect(tileSource).toContain("aria-label={`Edit ${project.name}`}");
    expect(tileSource).toContain("relative z-10");
  });

  it("leads each project with its own photo and status", () => {
    expect(tileSource).toContain('project.imageUrl || "/images/default_project_banner.jpg"');
    expect(tileSource).toContain("<StatusBadge");
  });

  it("keeps admin actions together in a thumb-reach bar on phones", () => {
    expect(source).toContain('to="/projects/new"');
    expect(source).toContain("to: '/administration'");
    expect(actionSource).toContain("fixed inset-x-0 bottom-0");
    expect(actionSource).toContain("env(safe-area-inset-bottom)");
    expect(actionSource).toContain("sm:hidden");
  });

  it("provides role-specific recovery and does not mutate query cache order", () => {
    expect(source).toContain("Create your first project");
    expect(source).toContain("No project access yet");
    expect(source).toContain("[...(projects || [])].sort");
    expect(source).toContain("<ErrorState");
  });

  it("exposes focus and reduced motion on the tile", () => {
    expect(tileSource).toContain("focus-visible:after:ring-2");
    expect(tileSource).toContain("motion-reduce:transition-none");
  });
});
