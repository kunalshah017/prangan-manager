import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const createSource = readFileSync(
  new URL("../../pages/centers/CreateCenter.tsx", import.meta.url),
  "utf8",
);
const editSource = readFileSync(
  new URL("../../pages/centers/EditCenter.tsx", import.meta.url),
  "utf8",
);
const layoutPath = new URL(
  "../../components/centers/CenterFormLayout.tsx",
  import.meta.url,
);

describe("center create and edit forms", () => {
  it("share one responsive center form composition", () => {
    expect(createSource).toContain("<CenterFormLayout");
    expect(editSource).toContain("<CenterFormLayout");
    expect(existsSync(layoutPath)).toBe(true);

    if (!existsSync(layoutPath)) return;
    const layoutSource = readFileSync(layoutPath, "utf8");
    expect(layoutSource).toContain("Center details");
    expect(layoutSource).toContain("Parent project");
    expect(layoutSource).toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
    expect(layoutSource).toContain("lg:sticky lg:bottom-3");
    expect(layoutSource).toContain("Danger zone");
  });

  it("blocks an edit route whose center belongs to another project", () => {
    expect(editSource).toContain(
      "center.projectId && center.projectId !== projectId",
    );
    expect(editSource).toContain("Center does not belong to this project");
    expect(editSource).toContain("Enter a center name and address.");
  });
});
