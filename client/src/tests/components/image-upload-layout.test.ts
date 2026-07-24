import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ImageUpload action layout", () => {
  it("keeps replace and remove controls outside fixed preview frames", () => {
    const source = readFileSync(
      new URL("../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("image-preview-frame");
    expect(source).toContain("image-upload-actions");
    expect(source).toContain("grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]");
    expect(source).toContain("w-full");
    expect(source.indexOf("image-upload-actions")).toBeGreaterThan(
      source.indexOf("image-preview-frame"),
    );
  });

  it("uses neutral profile-photo copy for rounded uploads", () => {
    const source = readFileSync(
      new URL("../../components/ui/image-upload.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const isRounded = variant === 'rounded'");
    expect(source).toContain("isRounded ? `${accessibleLabel} preview`");
    expect(source).toContain("!isRounded && (");
    expect(source).toContain("!isRounded && value && !error");
  });
});
