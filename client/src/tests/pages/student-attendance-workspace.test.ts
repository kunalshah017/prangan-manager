import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const markAttendance = readFileSync(
  new URL(
    "../../pages/student-attendance/MarkStudentAttendance.tsx",
    import.meta.url,
  ),
  "utf8",
);
const viewAttendance = readFileSync(
  new URL(
    "../../pages/student-attendance/ViewStudentAttendance.tsx",
    import.meta.url,
  ),
  "utf8",
);
const weekendDatePickerPath = new URL(
  "../../components/students/WeekendDatePicker.tsx",
  import.meta.url,
);

describe("Student attendance workspace", () => {
  it("uses a touch-friendly marking workflow with one save action", () => {
    expect(markAttendance).toContain("<WorkspacePage>");
    expect(markAttendance).toContain("<WorkspacePageHeader");
    expect(markAttendance).toContain("Mark all present");
    expect(markAttendance).toContain("Mark all absent");
    expect(markAttendance).toContain(
      'aria-pressed={entry?.status === "PRESENT"}',
    );
    expect(markAttendance).toContain("sticky bottom-3");
    expect(markAttendance.match(/Save attendance/g)).toHaveLength(1);
    expect(markAttendance).not.toContain("refetchIntervalMs: 5000");
  });

  it("keeps marking and viewing inside semester boundaries", () => {
    expect(markAttendance).toContain("useSemester");
    expect(markAttendance).toContain("semesterStartDate");
    expect(markAttendance).toContain("semesterEndDate");
    expect(markAttendance).toContain("isSelectedDateWithinSemester");
    expect(markAttendance).toContain("WeekendDatePicker");
    expect(markAttendance).toContain("isWeekendDate");
    expect(markAttendance).toContain("isSelectedDateWeekend");
    expect(markAttendance).not.toContain(
      "Attendance can only be marked on Saturday or Sunday between",
    );
    expect(viewAttendance.match(/<WeekendDatePicker/g)).toHaveLength(3);
    expect(viewAttendance).toContain('label="Single date"');
    expect(viewAttendance).toContain('label="From"');
    expect(viewAttendance).toContain('label="To"');
    expect(viewAttendance).not.toContain('type="date"');
    expect(viewAttendance).toContain("grid gap-3 sm:grid-cols-2");
    expect(viewAttendance).not.toContain("flex gap-2 items-center");
    expect(viewAttendance).toContain("isAttendanceRangeWithinSemester");
    expect(viewAttendance).toContain("min={semesterStartDate}");
    expect(viewAttendance).toContain("max={semesterEndDate}");
    expect(viewAttendance).toContain(
      "enabled: isAttendanceRangeWithinSemester",
    );
    expect(viewAttendance).toContain(
      "Attendance records are available only between",
    );
    expect(existsSync(weekendDatePickerPath)).toBe(true);
    if (existsSync(weekendDatePickerPath)) {
      const weekendDatePicker = readFileSync(weekendDatePickerPath, "utf8");
      expect(weekendDatePicker).toContain("DayPicker");
      expect(weekendDatePicker).toContain("dayOfWeek: [1, 2, 3, 4, 5]");
      expect(weekendDatePicker).toContain("before: minDate");
      expect(weekendDatePicker).toContain("after: maxDate");
      expect(weekendDatePicker).not.toContain(
        "Only Saturdays and Sundays can be selected",
      );
    }
  });

  it("makes attendance records recoverable and class-day focused", () => {
    expect(viewAttendance).toContain("<WorkspacePage>");
    expect(viewAttendance).toContain("<WorkspacePageHeader");
    expect(viewAttendance).toContain("getNearestWeekend");
    expect(viewAttendance).toContain("formatDateToLocal");
    expect(viewAttendance).toContain("hasAppliedSemesterDefault");
    expect(viewAttendance).toContain("semester?.startDate.slice(0, 10)");
    expect(viewAttendance).toMatch(
      /const clearFilters = \(\) => \{\s*setSelectedStatus\(""\);\s*setSelectedLevel\(""\);\s*\};/,
    );
    expect(viewAttendance).toContain("refetch: refetchAttendance");
    expect(viewAttendance).toContain("Clear filters");
    expect(viewAttendance).toContain("Current month");
    expect(viewAttendance).toContain("Full semester");
    expect(viewAttendance).toContain("Try again");
    expect(viewAttendance).not.toContain("motion.");
  });

  it("uses accessible control sizing and semantic workspace colors", () => {
    expect(markAttendance).toContain("min-h-11");
    expect(viewAttendance).toContain("min-h-11");
    expect(markAttendance).toContain("bg-card");
    expect(viewAttendance).toContain("bg-card");
    expect(markAttendance).toContain("text-muted-foreground");
    expect(viewAttendance).toContain("text-muted-foreground");
    expect(markAttendance).toContain("overflow-x-clip");
    expect(viewAttendance).toContain("overflow-x-clip");
  });

  it("organizes long attendance ranges into month-wise export-style tables", () => {
    expect(viewAttendance).toContain("monthTables");
    expect(viewAttendance).toContain("monthTables.map");
    expect(viewAttendance).toContain("Jump to month");
    expect(viewAttendance).toContain("sticky left-0");
    expect(viewAttendance).toContain("border-separate border-spacing-0");
    expect(viewAttendance).toContain("w-full min-w-max");
    expect(viewAttendance).not.toContain("border-collapse");
    expect(viewAttendance).toContain("max-w-full overflow-x-auto");
    expect(viewAttendance).toContain("<table");
    expect(viewAttendance).toContain("Student Name");
    expect(viewAttendance).toContain(
      'scope="rowgroup" className="sticky left-0',
    );
    expect(viewAttendance).toContain("<td colSpan={month.dates.length}");
    expect(viewAttendance).not.toContain(
      'colSpan={month.dates.length + 1} scope="rowgroup"',
    );
    expect(viewAttendance).toContain('size="sm"');
    expect(viewAttendance).not.toContain('size="xs"');
    expect(viewAttendance).not.toContain("Month to review");
    expect(viewAttendance).not.toContain("<details");
  });

  it("uses the semester level catalog for attendance filtering and ordering", () => {
    expect(markAttendance).toContain("academicLevel.journeyOrder");
    expect(markAttendance).not.toContain("const levelOrder");
    expect(viewAttendance).toContain("useSemesterLevels(semesterId!)");
    expect(viewAttendance).toContain("semesterLevelId === selectedLevel");
    expect(viewAttendance).toContain("sortLevelKeys");
    expect(viewAttendance).not.toContain("PRIMARY_A");
  });
});
