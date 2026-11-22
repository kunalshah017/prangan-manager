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

  it("shrinks every photo and sends a sign-up photo with the form, not to Cloudinary", async () => {
    const uploadSource = await readFile(
      new URL("../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );
    const cropSource = await readFile(
      new URL("../../components/ui/image-crop-dialog.tsx", import.meta.url),
      "utf8",
    );

    expect(cropSource).toContain("const MAX_IMAGE_SIDE = 1200;");
    expect(cropSource).toContain('canvas.toBlob(resolve, "image/jpeg", 0.85)');
    expect(uploadSource).toContain(
      "forRegistration ? await readAsDataUrl(file) : await uploadToCloudinary(file)",
    );
  });
});
