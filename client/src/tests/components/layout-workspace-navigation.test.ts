import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("layout workspace navigation", () => {
  it("only sends permitted projects into workspace navigation", async () => {
    const source = await readFile(
      new URL("../../components/Layout.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const visibleProjects = projects.filter");
    expect(source).toContain(
      'const canViewWorkspace = can(user, "workspace.view")',
    );
    expect(source).toContain(
      'can(user, "workspace.view", { projectId: project.id })',
    );
    expect(source).toContain("{canViewWorkspace && (");
    expect(source).toContain("projects={visibleProjects}");
    expect(source).toContain("canViewWorkspace={canViewWorkspace}");
    expect(source).not.toContain("projects.map((project) => (");
  });

  it("exposes desktop menu state and supports Escape dismissal", async () => {
    const source = await readFile(
      new URL("../../components/Layout.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("open={workspaceOpen}");
    expect(source).toContain('panelId="workspace-navigation-panel"');
    expect(source).not.toContain("open={toolsOpen}");
    expect(source).not.toContain("navigationModel.contextNavigation");
    expect(source).toContain("open={administrationOpen}");
    expect(source).toContain('panelId="administration-panel"');
    expect(source).toContain('event.key === "Escape"');
  });

  it("uses semantic menu surfaces and touch-safe shell controls", async () => {
    const source = await readFile(
      new URL("../../components/Layout.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("bg-popover");
    expect(source).toContain("text-popover-foreground");
    expect(source).toContain("h-11 w-11");
    expect(source).toContain("px-4 pb-5 pt-3 sm:px-6 sm:pb-7 sm:pt-4 lg:px-8");
    expect(source).not.toContain("bg-white py-1 shadow-lg ring-1 ring-black");
  });

  it("keeps the shared breadcrumb row compact", async () => {
    const [source, primitiveSource] = await Promise.all([
      readFile(
        new URL("../../components/BreadcrumbNavigation.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../components/ui/breadcrumb.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(source).toContain("mb-2");
    expect(source).toContain("min-h-9");
    expect(source).toContain("breadcrumbSignature");
    expect(source).toContain("[breadcrumbSignature, location.pathname]");
    expect(source).toContain('behavior: "auto"');
    expect(source).not.toContain('behavior: "smooth"');
    expect(source).not.toContain("mb-4 flex min-h-11");
    expect(source).toContain("breadcrumbs.slice(-2)");
    expect(source).toContain("max-w-[120px] sm:max-w-[150px]");
    expect(primitiveSource).toContain("flex size-11 items-center justify-center");
  });

  it("uses one role-aware model across desktop and mobile navigation", async () => {
    const source = await readFile(
      new URL("../../components/Layout.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("buildNavigationModel(user");
    expect(source).toContain("<WorkspaceTree");
    expect(source).not.toContain("<ContextTools");
    expect(source).toContain("<MobileNavigation");
    expect(source).toContain("getNavigationContextFromPathname");
    expect(source).toContain("isAdministrationPathActive");
    expect(source).toContain("Administration");
    expect(source).not.toContain("canViewStudents");
    expect(source).not.toContain("hasPermission");
    expect(source).not.toContain("ProjectNavigation");
  });

  it("lets an open desktop disclosure close from its own trigger", async () => {
    const source = await readFile(
      new URL("../../components/Layout.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const nextOpen = !workspaceOpen");
    expect(source).not.toContain("const nextOpen = !toolsOpen");
    expect(source).toContain("const nextOpen = !administrationOpen");
  });
});
