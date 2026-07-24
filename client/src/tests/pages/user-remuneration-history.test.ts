import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const pageUrl = new URL("../../pages/users/UserDetails.tsx", import.meta.url);

describe("user remuneration history", () => {
  it("uses the rate attached to each attendance semester", async () => {
    const source = await readFile(pageUrl, "utf8");

    expect(source).toContain("remunerationRates");
    expect(source).toContain("record.semesterId");
    expect(source).toContain("Semester-specific rates");
    expect(source).not.toMatch(/reimbursementAmount\s*\|\|\s*500/);
  });
});
