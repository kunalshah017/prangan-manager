import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CustomButton hover sheen", () => {
  it("clips the decorative overlay within the button and keeps content above it", async () => {
    const source = await readFile(
      new URL("../../../components/ui/custom-button.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("overflow-hidden");
    expect(source).toContain("pointer-events-none");
    expect(source).toContain("relative z-10 flex items-center justify-center");
    expect(source).toContain("-translate-x-full");
    expect(source).toContain("group-hover:translate-x-[300%]");
  });
});
