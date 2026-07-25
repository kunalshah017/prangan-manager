import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("remuneration payment interactions", () => {
  it("submits only scope, month, and selected user IDs", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/mutateAsync\(\{\s*projectId,\s*centerId,\s*semesterId,\s*month:\s*period,\s*userIds/);
    expect(source).not.toMatch(/mutateAsync\(\{[\s\S]{0,240}\bamount:/);
    expect(source).toContain("setPaymentResults");
    expect(source).toContain("result.status ===");
    expect(source).toContain('result.reason === "NOT_ELIGIBLE"');
    expect(source).toContain('result.reason === "MISSING_REMUNERATION"');
    expect(source).toContain('result.reason === "PROCESSING_FAILED"');
    expect(source).toContain("enabled: isAdmin");
  });

  it("keeps incomplete and no-payment rows out of ready selection", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('paymentState === "READY"');
    expect(source).toContain("disabled={pay.isPending");
    expect(source).toContain('period === "FULL"');
  });

  it("does not present admin-only payment state as authoritative to non-admin readers", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Calculated from recorded attendance and schedule.");
    expect(source).toContain("{isAdmin && <PaidDetails");
    expect(source).toContain("{isAdmin ? (");
  });
});
