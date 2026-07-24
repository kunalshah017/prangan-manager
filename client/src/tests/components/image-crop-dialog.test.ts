import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("image crop workflow", () => {
  it("opens crop before upload and exposes replace and remove actions", async () => {
    const uploadSource = await readFile(
      new URL("../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );
    const cropSource = await readFile(
      new URL("../../components/ui/image-crop-dialog.tsx", import.meta.url),
      "utf8",
    );

    expect(uploadSource).toContain("<ImageCropDialog");
    expect(uploadSource).toContain(
      'aria-label={value ? "Replace image" : "Upload custom image"}',
    );
    expect(uploadSource).toContain(
      '{value ? "Replace image" : "Upload custom image"}',
    );
    expect(uploadSource).toContain('aria-label="Remove image"');
    expect(uploadSource).toContain('type="button"');
    expect(uploadSource).not.toContain('role="button"');
    expect(cropSource).toContain("react-easy-crop");
    expect(cropSource).toContain("Use cropped image");
    expect(cropSource).toContain("URL.revokeObjectURL");
  });
});
