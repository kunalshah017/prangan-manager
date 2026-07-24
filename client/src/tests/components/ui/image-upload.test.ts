import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("ImageUpload accessibility", () => {
  it("uses a native upload trigger and delegates source selection to the shared modal", async () => {
    const source = await readFile(
      new URL("../../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('type="button"');
    expect(source).toContain('const accessibleLabel = label || "Image"');
    expect(source).toContain(
      "aria-label={`Upload ${accessibleLabel.toLowerCase()}`}",
    );
    expect(source).not.toContain('role="button"');
    expect(source).not.toContain("handleKeyDown");
    expect(source).toContain("<Modal isOpen={showOptions}");
  });

  it("shows a display-only fallback with always-visible image actions", async () => {
    const source = await readFile(
      new URL("../../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("fallbackValue?: string");
    expect(source).toContain("fallbackLabel?: string");
    expect(source).toContain("const previewValue = value || fallbackValue");
    expect(source).toContain("Replace image");
    expect(source).toContain("Remove image");
    expect(source).toContain("{value && (");
    expect(source).not.toContain("group-hover:opacity-100");
  });
});
