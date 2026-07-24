import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("staff attendance records workspace", () => {
  it("uses shared weekend filters, recovery, and semantic workspace styling", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/ViewAttendance.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("<WorkspacePage>");
    expect(source).toContain("<WorkspacePageHeader");
    expect(source.match(/<WeekendDatePicker/g)).toHaveLength(3);
    expect(source).toContain('label="Single date"');
    expect(source).toContain('label="From"');
    expect(source).toContain('label="To"');
    expect(source).toContain("Current month");
    expect(source).toContain("Full semester");
    expect(source).toContain("Clear filters");
    expect(source).toContain("Try again");
    expect(source).toContain("min-h-11");
    expect(source).toContain("bg-card");
    expect(source).not.toContain("motion.");
    expect(source).not.toMatch(/(?:bg|text|border)-(?:gray|orange)-/);
  });

  it("renders month tables grouped by role with all four statuses", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/ViewAttendance.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("monthTables.map");
    expect(source).toContain("Jump to month");
    expect(source).toContain("Center Manager");
    expect(source).toContain("Educator");
    expect(source).toContain("Not available");
    expect(source).toContain("attendanceRate");
    expect(source).toContain("Present/(Present + Absent)");
    expect(source).toContain("sticky left-0");
    expect(source).toContain("w-full min-w-max");
    expect(source).toContain("max-w-full overflow-x-auto");
    expect(source).toContain("getStatusCellLabel");
    expect(source).toContain("ProfilePicture");
    expect(source).toContain("border-success/40 bg-success/15 text-success");
    expect(source).toContain(
      "border-destructive/40 bg-destructive/15 text-destructive",
    );
    expect(source).toContain(
      "border-warning/50 bg-warning/20 text-warning-foreground",
    );
    expect(source).not.toContain(">Role</th>");
    expect(source).not.toContain("sticky left-56");
  });

  it("retains export gating and both existing export formats", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/ViewAttendance.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("canExport");
    expect(source).toContain("exportBlockedMessage");
    expect(source).toContain("exportToExcel");
    expect(source).toContain("exportToPDF");
    expect(source).toContain("Export CSV");
    expect(source).toContain("Export PDF");
    expect(source).toContain('"Marked at"');
    expect(source).toContain('"Reimbursement rate"');
    expect(source).toContain("Remuneration");
    expect(source).toContain("dailyRate");
    expect(source).not.toMatch(/\?\?\s*500|\|\|\s*500/);
  });
});
