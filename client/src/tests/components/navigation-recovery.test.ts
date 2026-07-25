import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("navigation recovery", () => {
  it("links edit breadcrumbs to real list routes and renders a dedicated Not Found screen", async () => {
    const breadcrumbs = await readFile(
      new URL("../../components/BreadcrumbNavigation.tsx", import.meta.url),
      "utf8",
    );
    const routes = await readFile(
      new URL("../../App.tsx", import.meta.url),
      "utf8",
    );

    expect(breadcrumbs).not.toContain("href: `/projects/${params.id}`");
    expect(breadcrumbs).not.toContain("centers/${params.id}`");
    expect(breadcrumbs).not.toContain("semesters/${params.id}`");
    expect(routes).toContain("const NotFoundPage");
    expect(routes).toContain('<Route path="*" element={<NotFoundPage />} />');
  });

  it("renders the current breadcrumb as text instead of a disabled link", async () => {
    const primitive = await readFile(
      new URL("../../components/ui/breadcrumb.tsx", import.meta.url),
      "utf8",
    );

    expect(primitive).toContain('aria-current="page"');
    expect(primitive).not.toContain('role="link"');
    expect(primitive).not.toContain('aria-disabled="true"');
  });

  it("uses semantic parent links and history only when a page has no parent", async () => {
    const navigation = await readFile(
      new URL("../../components/BreadcrumbNavigation.tsx", import.meta.url),
      "utf8",
    );

    expect(navigation).toContain("backTarget.href");
    expect(navigation).toContain("navigate(-1)");
    expect(navigation).toContain("aria-label={backLabel}");
    expect(navigation).toContain('aria-label="Page navigation"');
  });

  it("keeps explicit navigation to the Projects list on the Projects page", async () => {
    const projects = await readFile(
      new URL("../../pages/projects/Projects.tsx", import.meta.url),
      "utf8",
    );

    expect(projects).not.toContain("pm:autoNavHandled");
    expect(projects).not.toContain("Opening your workspace");
    expect(projects).not.toContain("useNavigate");
  });
});
