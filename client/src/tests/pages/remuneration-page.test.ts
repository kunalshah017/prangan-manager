import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const pageUrl = new URL(
  "../../pages/attendance/Remuneration.tsx",
  import.meta.url,
);

describe("remuneration page UX", () => {
  it("uses a responsive read-only monthly payment workflow", async () => {
    const source = await readFile(pageUrl, "utf8");

    expect(source).toContain("Remuneration");
    expect(source).not.toContain("Renumeration");
    expect(source).toContain("Incomplete");
    expect(source).toContain("Mark as paid");
    expect(source).toContain("Applicable schedule");
    expect(source).toContain("Manage remuneration settings");
    expect(source).not.toContain("Save remuneration");
    expect(source).not.toContain('type="date"');
    expect(source).toContain("lg:grid-cols-2");
    expect(source).toContain("min-h-11");
    expect(source).not.toContain('inputMode="decimal"');
    expect(source).not.toMatch(/\|\|\s*500/);
  });
});
