import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const createSource = readFileSync(
  new URL("../../pages/projects/CreateProject.tsx", import.meta.url),
  "utf8",
);
const editSource = readFileSync(
  new URL("../../pages/projects/EditProject.tsx", import.meta.url),
  "utf8",
);
const layoutPath = new URL(
  "../../components/projects/ProjectFormLayout.tsx",
  import.meta.url,
);
const apiTypes = readFileSync(
  new URL("../../types/api.ts", import.meta.url),
  "utf8",
);

describe("project create and edit forms", () => {
  it("share one responsive project form composition", () => {
    expect(createSource).toContain("<ProjectFormLayout");
    expect(editSource).toContain("<ProjectFormLayout");

    const layoutSource = readFileSync(layoutPath, "utf8");
    expect(layoutSource).toContain("Project details");
    expect(layoutSource).toContain("Availability");
    expect(layoutSource).toContain("Project banner");
    expect(layoutSource).toContain("/images/default_project_banner.jpg");
    expect(layoutSource).toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
    expect(layoutSource).toContain("<FormActions");
    expect(layoutSource).toContain('type="radio"');
  });

  it("keeps Save within reach on phones and sticky under long forms on desktop", () => {
    const formParts = readFileSync(
      new URL("../../components/workspace/FormParts.tsx", import.meta.url),
      "utf8",
    );
    expect(formParts).toContain("fixed inset-x-0 bottom-0");
    expect(formParts).toContain("lg:sticky lg:bottom-3");
    expect(formParts).toContain("Danger zone");
  });

  it("clears custom banners with null and separates project deletion", () => {
    expect(apiTypes).toContain("imageUrl?: string | null");
    expect(editSource).toContain("imageUrl: imageUrl || null");
    expect(editSource).toContain("onImageRemove={() => setImageUrl('')}");
    const layoutSource = readFileSync(layoutPath, "utf8");
    expect(layoutSource).toContain("<DangerZone");
    expect(layoutSource).toContain("Delete project");
  });
});
