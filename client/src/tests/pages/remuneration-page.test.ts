import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const pageUrl = new URL(
  "../../pages/attendance/Remuneration.tsx",
  import.meta.url,
);

describe("remuneration page UX", () => {
  it("uses responsive payee views and effective-dated remuneration", async () => {
    const source = await readFile(pageUrl, "utf8");

    expect(source).toContain("Remuneration");
    expect(source).not.toContain("Renumeration");
    expect(source).toContain("Needs remuneration");
    expect(source).toContain("Save remuneration");
    expect(source).toContain("Effective from");
    expect(source).toContain('type="date"');
    expect(source).toContain("md:hidden");
    expect(source).toContain("hidden md:block");
    expect(source).toContain("min-h-11");
    expect(source).toContain('inputMode="decimal"');
    expect(source).toContain("previewPayees");
    expect(source).not.toMatch(/\|\|\s*500/);
  });
});
