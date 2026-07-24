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
    expect(dashboard).toContain(
      "enabled: dashboardModel.visibility.staffAttendance",
    );
    expect(dashboard).toContain("level: dashboardModel.assignedLevel");
    expect(dashboard).toContain("useSyllabusStatistics");
    expect(dashboard).toContain("useExams");
    expect(dashboard).toContain("enabled: dashboardModel.visibility.exams");
    expect(dashboard).not.toContain("ProtectedComponent");
    expect(dashboard).not.toContain("allowedSubRoles");
  });

  it("uses a responsive operational layout and semantic tokens", () => {
    expect(dashboard).toContain("lg:grid-cols-12");
    expect(dashboard).toContain("lg:col-span-8");
    expect(dashboard).toContain("lg:col-span-4");
    expect(dashboard).toContain("Needs attention");
    expect(dashboard).toContain("Semester snapshot");
    expect(dashboard).toContain("Quick actions");
    expect(dashboard).toContain("min-h-11");
    expect(dashboard).toContain("bg-card");
    expect(dashboard).toContain("text-muted-foreground");
    expect(dashboard).not.toMatch(
      /bg-(blue|purple|orange|green|indigo)-[5-7]00/,
    );
    for (const emoji of ["📚", "📅", "📖", "👥", "⚙️", "✨"]) {
      expect(dashboard).not.toContain(`>${emoji}`);
    }
  });

  it("removes stale navigation state and formats semester dates in UTC", () => {
    expect(dashboard).toContain('timeZone: "UTC"');
    expect(dashboard).not.toContain("sessionStorage");
    expect(dashboard).not.toContain("dashboardContext");
  });

  it("uses focused dashboard primitives", () => {
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
    ).toBe(true);
    expect(dashboard).toContain("<DashboardAction");
    expect(dashboard).toContain("<DashboardMetric");
  });

  it("shows changing semester outcomes instead of permissions or fixed configuration", () => {
    expect(dashboard).toContain('label="Curriculum progress"');
    expect(dashboard).toContain('label="Active exams"');
    expect(dashboard).toContain("completionPercentage");
    expect(dashboard).toContain("upcomingExams");
    expect(dashboard).toContain("completedExams");
    expect(dashboard).not.toContain('label="Active syllabi"');
    expect(dashboard).not.toContain('label="Assessment access"');
    expect(dashboard).not.toContain('value="Open"');
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

  it("uses a compact mobile-first tool launcher without a duplicated masthead action", () => {
    const action = readFileSync(
      new URL(
        "../../components/dashboard/DashboardAction.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(dashboard).toContain("grid-cols-3");
    expect(dashboard).toContain("min-[380px]:grid-cols-4");
    expect(dashboard).toContain("sm:hidden");
    expect(dashboard).toContain('variant="tile"');
    expect(dashboard).toContain("dashboardModel.actionGroups.map((group)");
    expect(dashboard).toContain("Mobile tool group");
    expect(dashboard).toContain("group.label");
    expect(dashboard).not.toContain("primaryAction");
    expect(action).toContain('variant?: "row" | "tile"');
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

  it("renders the all-clear attention state as a compact mobile status", () => {
    expect(dashboard).toContain("Mobile semester status");
    expect(dashboard).toContain("All caught up");
    expect(dashboard).toContain("hidden sm:flex");
    expect(dashboard.indexOf('aria-label="Mobile semester status"')).toBeLessThan(
      dashboard.indexOf('aria-label="Mobile semester tools"'),
    );
  });

  it("keeps global resources out of semester actions", () => {
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

    expect(model).not.toContain('label: "Library"');
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
