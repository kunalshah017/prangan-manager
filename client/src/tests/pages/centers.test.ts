import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../pages/centers/Centers.tsx", import.meta.url),
  "utf8",
);

describe("Centers workspace launcher", () => {
  it("uses semantic semester links with separate named edit actions", () => {
    expect(source).toContain(
      "href={centerCardDestination(projectId, center.id)}",
    );
    expect(source).toContain(
      "editLabel={isAdmin() ? `Edit ${center.name}` : undefined}",
    );
    expect(source).not.toContain(
      "onClick={() => handleCenterClick(center.id)}",
    );
    expect(source).not.toContain(">Semesters</button>");
  });

  it("maps center data into the shared classroom media card", () => {
    expect(source).toContain("import { WorkspaceCard }");
    expect(source).toContain("<WorkspaceCard");
    expect(source).toContain('entityLabel="Center"');
    expect(source).toContain('mediaSrc="/images/default_center_banner.jpg"');
    expect(source).toContain('openLabel="Open center"');
    expect(source).toContain("<MapPin");
    expect(source).toContain(
      "editHref={isAdmin() ? `/projects/${projectId}/centers/${center.id}/edit` : undefined}",
    );
  });

  it("shows project context and role-specific recovery without mutating cache", () => {
    expect(source).toContain("[...(centers || [])].sort");
    expect(source).toContain(
      '<h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Centers</h1>',
    );
    expect(source).toContain(
      "{project.name} · Choose a center to continue to its semesters and current academic work.",
    );
    expect(source).toContain("Create the first center");
    expect(source).toContain("No center access yet");
    expect(source).toContain("Open center");
  });
});
