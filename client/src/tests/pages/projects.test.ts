import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../pages/projects/Projects.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../../components/workspace/WorkspaceCard.tsx", import.meta.url),
  "utf8",
);

describe("Projects workspace launcher", () => {
  it("uses a semantic workspace link and separate accessible admin edit action", () => {
    expect(source).toContain("href={projectCardDestination(project.id)}");
    expect(source).toContain(
      "editLabel={isAdmin() ? `Edit ${project.name}` : undefined}",
    );
    expect(source).toContain("{isAdmin() && (");
    expect(source).not.toContain(
      "onClick={() => handleProjectClick(project.id)}",
    );
  });

  it("maps project data into the shared image-ready card", () => {
    expect(source).toContain("import { WorkspaceCard }");
    expect(source).toContain("<WorkspaceCard");
    expect(source).toContain('entityLabel="Project"');
    expect(source).toContain(
      'project.imageUrl || "/images/default_project_banner.jpg"',
    );
    expect(source).toContain('openLabel="Open workspace"');
    expect(source).toContain(
      "editHref={isAdmin() ? `/projects/${project.id}/edit` : undefined}",
    );
  });

  it("provides role-specific recovery and does not mutate query cache order", () => {
    expect(source).toContain("Create your first project");
    expect(source).toContain("No project access yet");
    expect(source).toContain("[...(projects || [])].sort");
  });

  it("exposes orientation, async announcements, focus, and reduced motion", () => {
    expect(source).toContain(
      "Choose a project to continue to its centers and current work.",
    );
    expect(source).toContain('aria-live="polite"');
    expect(cardSource).toContain("focus-visible:ring-2");
    expect(cardSource).toContain("motion-reduce:transition-none");
  });
});
