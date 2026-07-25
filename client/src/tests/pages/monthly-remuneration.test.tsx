import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("monthly remuneration payment page", () => {
  it("is read-only and points remuneration configuration to Semester Users", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("useSetRemunerationPeriod");
    expect(source).not.toContain("RemunerationRateField");
    expect(source).not.toContain("UnsavedRatesNotice");
    expect(source).not.toContain("Save remuneration");
    expect(source).not.toContain('type="number"');
    expect(source).not.toContain('type="date"');
    expect(source).toContain("Manage remuneration settings");
    expect(source).toContain("/dashboard/users");
    expect(source).toContain("Applicable schedule");
  });

  it("exposes monthly payment states and bulk actions but no full-semester payment action", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    for (const text of [
      "Ready",
      "Incomplete",
      "No payment due",
      "Paid",
      "Mark as paid",
      "Mark selected as paid",
      "Select all ready",
      "Payment results",
    ]) {
      expect(source).toContain(text);
    }
    expect(source).toContain('period !== "FULL"');
    expect(source).toContain("useMarkRemunerationPaid");
  });
});
