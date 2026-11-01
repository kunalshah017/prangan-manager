import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardPath = new URL(
  "../../pages/semesters/Dashboard.tsx",
  import.meta.url,
);
const dashboard = readFileSync(dashboardPath, "utf8");

describe("semester dashboard", () => {
  it("uses one exact permission model to drive role content and query gates", () => {
    expect(dashboard).toContain("buildDashboardModel");
    expect(dashboard).toContain("dashboardModel.visibility.students");
    expect(dashboard).toContain("dashboardModel.visibility.staff");
    expect(dashboard).toContain("dashboardModel.visibility.curriculum");
    expect(dashboard).toContain("enabled: dashboardModel.visibility.staff");
    // Attendance to-dos live in notifications, so today's records aren't loaded.
    expect(dashboard).not.toContain("useAttendanceRecords");
    expect(dashboard).not.toContain("useStudentAttendanceRecords");
    expect(dashboard).toContain(
      "semesterLevelId: dashboardModel.assignedSemesterLevelId",
    );
    expect(dashboard).not.toContain("dashboardModel.assignedLevel");
    expect(dashboard).not.toContain(
      "semesterLevelId: dashboardModel.assignedLevel",
    );
    // The snapshot numbers are gone, so their queries are not loaded.
    expect(dashboard).not.toContain("useSyllabusStatistics");
    expect(dashboard).not.toContain("useExams");
    expect(dashboard).not.toContain("ProtectedComponent");
    expect(dashboard).not.toContain("allowedSubRoles");
  });

  it("derives level ordering and labels from the current semester", () => {
    expect(dashboard).toContain("semesterQuery.data?.levels");
    expect(dashboard).toContain("sortByJourneyOrder");
    expect(dashboard).toContain("resolveSemesterLevelId(student)");
    expect(dashboard).not.toContain("semesterLevelIdByCode");
    expect(dashboard).not.toContain("reference?.level");
    expect(dashboard).not.toContain("const levelOrder =");
    expect(dashboard).not.toContain('PRIMARY_A: "Primary A"');
    expect(dashboard).not.toContain('"LEVEL_4"');
  });

  it("uses one phone-first layout with a desktop side column and semantic tokens", () => {
    expect(dashboard).toContain("lg:grid-cols-[minmax(0,1fr)_24rem]");
    expect(dashboard).not.toContain("Semester snapshot");
    expect(dashboard).not.toContain("Quick actions");
    expect(dashboard).not.toContain("sm:hidden");
    expect(dashboard).not.toContain("hidden sm:block");
    expect(dashboard).toContain("bg-card");
    expect(dashboard).toContain("text-muted-foreground");
    expect(dashboard).not.toMatch(
      /bg-(blue|purple|orange|green|indigo)-[5-7]00/,
    );
    for (const emoji of ["📚", "📅", "📖", "👥", "⚙️", "✨"]) {
      expect(dashboard).not.toContain(`>${emoji}`);
    }
  });

  it("removes stale navigation state and does not repeat the centre or dates", () => {
    // The breadcrumb names the centre; the centre dashboard shows the dates.
    expect(dashboard).not.toContain("formatCalendarDate");
    expect(dashboard).not.toContain("useCenter(");
    expect(dashboard).not.toContain("roleLabel");
    expect(dashboard).not.toContain("sessionStorage");
    expect(dashboard).not.toContain("dashboardContext");
  });

  it("uses the tile launcher and no snapshot metrics", () => {
    expect(
      existsSync(
        new URL(
          "../../components/dashboard/DashboardAction.tsx",
          import.meta.url,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        new URL(
          "../../components/dashboard/DashboardMetric.tsx",
          import.meta.url,
        ),
      ),
    ).toBe(false);
    expect(dashboard).toContain("<DashboardAction");
    expect(dashboard).not.toContain("DashboardMetric");
  });

  it("lists in-progress topics only when one syllabus is in view", () => {
    expect(dashboard).toContain(
      "visibleSyllabi.length === 1 ? visibleSyllabi[0] : undefined",
    );
    expect(dashboard).toContain("ongoingItems.length > 0 &&");
  });

  it("uses one clear heading per dashboard section", () => {
    for (const redundantEyebrow of [
      ">Today</p>",
      ">Workspace</p>",
      ">Academics</p>",
      ">Current scope</p>",
      ">Student stories</p>",
    ]) {
      expect(dashboard).not.toContain(redundantEyebrow);
    }
  });

  it("uses one compact tool launcher for every screen size", () => {
    const action = readFileSync(
      new URL(
        "../../components/dashboard/DashboardAction.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(dashboard).toContain("grid-cols-3");
    expect(dashboard).toContain("min-[380px]:grid-cols-4");
    expect(dashboard).toContain('aria-label="Semester tools"');
    expect(dashboard).toContain("dashboardModel.actionGroups.map((group)");
    expect(dashboard).toContain("group.label");
    expect(dashboard).not.toContain("primaryAction");
    expect(action).not.toContain("variant");
    expect(action).not.toContain("action.description");
    expect(action).toContain("action.mobileLabel");
    expect(action).toContain("h-[4.5rem]");
    expect(action).toContain("grid-rows-[1.5rem_2rem]");
    expect(action).toContain("gap-1");
    expect(action).toContain("px-2");
    expect(action).toContain("h-6 w-6");
    expect(action).toContain("h-8 items-center");
    expect(action).toContain("self-start text-muted-foreground");
    expect(action).not.toContain("self-start rounded-md bg-muted");
    expect(action).not.toContain("action.primary");
    expect(action).not.toContain("bg-primary/10 text-primary");
    expect(dashboard).not.toContain('"Add student"');
  });

  it("leaves to-dos to notifications: no Needs attention list", () => {
    expect(dashboard).not.toContain("Needs attention");
    expect(dashboard).not.toContain("Add your bank details");
    expect(dashboard).not.toContain("All caught up");
    expect(dashboard).not.toContain("actionLabel");
  });

  it("keeps administration out while exposing the Library from semester actions", () => {
    const model = readFileSync(
      new URL("../../lib/dashboard.ts", import.meta.url),
      "utf8",
    );
    const mobileNavigation = readFileSync(
      new URL(
        "../../components/navigation/MobileNavigation.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(model).toContain('label: "Library"');
    expect(model).toContain(
      '/semesters/${context.semesterId}/dashboard/library`',
    );
    expect(model).not.toContain('label: "Administration"');
    expect(mobileNavigation).not.toContain(">Navigation</p>");
    expect(mobileNavigation).not.toContain(">Prangan Manager</p>");
    expect(mobileNavigation).not.toContain(">Current semester</h2>");
    expect(mobileNavigation).not.toContain("contextNavigation");
    expect(mobileNavigation).not.toContain("contextHrefs");
    expect(mobileNavigation).toContain(
      "const standaloneResources = model.universal",
    );
  });
});
