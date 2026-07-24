import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  MonthlySemesterOverview,
  RemunerationRateField,
  UnsavedRatesNotice,
} from "@/pages/attendance/Remuneration";

const summary = {
  presentDays: 8,
  missingRateUserIds: ["user-2"],
  calculatedAmount: null,
  isComplete: false,
  months: [
    {
      month: "2026-07",
      label: "Jul 2026",
      startDate: "2026-07-12",
      endDate: "2026-07-31",
      presentDays: 3,
      missingRateUserIds: [],
      calculatedAmount: 1875,
      isComplete: true,
      status: "READY" as const,
    },
    {
      month: "2026-08",
      label: "Aug 2026",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      presentDays: 5,
      missingRateUserIds: ["user-2"],
      calculatedAmount: null,
      isComplete: false,
      status: "NEEDS_RATE" as const,
    },
    {
      month: "2026-09",
      label: "Sep 2026",
      startDate: "2026-09-01",
      endDate: "2026-09-08",
      presentDays: 0,
      missingRateUserIds: [],
      calculatedAmount: 0,
      isComplete: true,
      status: "NO_PAYABLE_ATTENDANCE" as const,
    },
  ],
};

describe("monthly remuneration page", () => {
  it("initializes the ledger with the semester-aware default month", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('const [period, setPeriod] = useState("")');
    expect(source).toContain("selectDefaultSemesterMonth(");
    expect(source).not.toContain('useState("FULL")');
  });

  it("renders a compact, actionable month composition for the full semester", () => {
    const markup = renderToStaticMarkup(
      <MonthlySemesterOverview
        summary={summary}
        onSelectMonth={() => undefined}
      />,
    );

    expect(markup).toContain("Semester total");
    expect(markup).toContain("Pending remuneration");
    expect(markup).toContain("Jul 2026");
    expect(markup).toContain("12 Jul – 31 Jul");
    expect(markup).toContain("₹1,875");
    expect(markup).toContain("Aug 2026");
    expect(markup).toContain("1 amount missing");
    expect(markup).toContain("No payable attendance");
    expect(markup).toContain('aria-label="View Jul 2026 remuneration"');
    expect(markup.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("renders accessible, decimal-safe rate validation", () => {
    const markup = renderToStaticMarkup(
      <RemunerationRateField
        userId="user-1"
        userName="Asha"
        value="10.005"
        error="Use no more than 2 decimal places."
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('inputMode="decimal"');
    expect(markup).toContain('min="0"');
    expect(markup).toContain('step="0.01"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="remuneration-rate-user-1-error"');
    expect(markup).toContain("Use no more than 2 decimal places.");
    expect(markup).toContain("text-base");
  });

  it("explains persisted full-semester totals and keeps save available", () => {
    const markup = renderToStaticMarkup(
      <UnsavedRatesNotice
        isFullSemester
        hasInvalidRate={false}
        isPending={false}
        saveError=""
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain("Unsaved remuneration changes");
    expect(markup).toContain("saved schedule");
    expect(markup).toContain("Save remuneration");
  });

  it("turns a failed rate save into an actionable retry state", () => {
    const markup = renderToStaticMarkup(
      <UnsavedRatesNotice
        isFullSemester={false}
        hasInvalidRate={false}
        isPending={false}
        saveError="Unable to save semester rates."
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Remuneration was not saved");
    expect(markup).toContain("Try saving again");
  });

  it("uses persisted data for full-semester totals and resets scoped view state", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      'period === "FULL" ? persistedResult : previewResult',
    );
    expect(source).toContain('setSearch("")');
    expect(source).toContain('setReadiness("ALL")');
    expect(source).toContain("setExpanded({})");
    expect(source).toContain("aria-expanded={Boolean(isExpanded)}");
    expect(source).toContain("aria-controls={detailsId}");
  });

  it("does not introduce payment, email, or expenditure actions", () => {
    const markup = renderToStaticMarkup(
      <MonthlySemesterOverview
        summary={summary}
        onSelectMonth={() => undefined}
      />,
    );

    expect(markup).not.toMatch(/mark paid|send email|add expenditure/i);
  });

  it("keeps future payment workflow controls out of the ledger page", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/mark paid|send email|add expenditure/i);
  });
});
