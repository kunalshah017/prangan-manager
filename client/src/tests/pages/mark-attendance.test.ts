import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("staff attendance marking", () => {
  it("uses the workspace attendance shell and preserves exact assignment payloads", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/MarkAttendance.tsx", import.meta.url),
      "utf8",
    );
    const implementation = await readFile(
      new URL(
        "../../pages/attendance/MarkStaffAttendance.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain("MarkStaffAttendance");
    expect(implementation).toContain("WorkspacePage");
    expect(implementation).toContain("WorkspacePageHeader");
    expect(implementation).toContain("WeekendDatePicker");
    expect(implementation).toContain("useSemester");
    expect(implementation).toContain("const getActiveStaffAssignment");
    expect(implementation).toContain("assignment.isActive");
    expect(implementation).toContain(
      "roleAssignmentId: entry.roleAssignmentId",
    );
    expect(implementation).toContain("notes: entry.notes");
    expect(implementation).not.toContain("roleAssignments?.[0]");
    expect(implementation).not.toContain("roleAssignments[0]");
    expect(implementation).toContain("activeUsersQuery.refetch()");
    expect(implementation).toContain("attendanceQuery.refetch()");
    expect(implementation).not.toContain("window.location.reload");
    expect(implementation).not.toContain("window.confirm");
    expect(implementation).not.toContain("framer-motion");
    expect(implementation).not.toMatch(/(?:bg|text|border)-(?:gray|orange)-/);
  });

  it("exposes automatic staff defaults, bulk controls, counts, notes, holiday, and one sticky save action", async () => {
    const source = await readFile(
      new URL(
        "../../pages/attendance/MarkStaffAttendance.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain('? "ABSENT"');
    expect(source).toContain(': "NOT_AVAILABLE"');
    expect(source).toMatch(
      /status:\s*checked \? "PRESENT" : getDefaultStatus\(staff\)/,
    );
    expect(source).toContain("Mark expected present");
    expect(source).toContain("grid grid-cols-1 gap-2 sm:flex");
    expect(source.match(/whitespace-nowrap/g)).toHaveLength(2);
    expect(source).toContain("Reset defaults");
    expect(source).toContain("Not available");
    expect(source).toContain("Committed day");
    expect(source).toContain("aria-pressed");
    expect(source).toContain("staff-status-${staff.id}");
    expect(source).toContain("aria-describedby={`staff-status-${staff.id}`}");
    expect(source).toContain("Current status:");
    expect(source).toContain("aria-label={`Current status: ${config.label}`}");
    expect(source).toContain("border-success/40 bg-success/15 text-success");
    expect(source).toContain(
      "border-destructive/40 bg-destructive/15 text-destructive",
    );
    expect(source).toContain(
      "border-warning/50 bg-warning/20 text-warning-foreground",
    );
    expect(source).toContain("justify-self-end");
    expect(source).toContain(
      'entry?.status === "PRESENT" ? "Unmark present" : "Mark present"',
    );
    expect(source).toContain("aria-expanded");
    expect(source).toContain("Holiday reason");
    expect(source).toContain("sticky bottom-3");
    expect(source.match(/Save staff attendance/g)).toHaveLength(1);
    expect(source).toContain("min-w-0");
    expect(source).toContain("overflow-x-clip");
  });
});
