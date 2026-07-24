import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../pages/semesters/Semesters.tsx", import.meta.url),
  "utf8",
);

describe("Semesters workspace launcher", () => {
  it("uses semantic dashboard or setup links with separate named edit actions", () => {
    expect(source).toContain("semesterCardDestination(");
    expect(source).toContain(
      "editLabel={canManageSemesters ? `Edit ${semester.name}` : undefined}",
    );
    expect(source).not.toContain(
      "onClick={() => handleSemesterClick(semester.id)}",
    );
    expect(source).not.toContain(">Dashboard</button>");
  });

  it("maps semester data into the shared classroom media card", () => {
    expect(source).toContain("import { WorkspaceCard }");
    expect(source).toContain("<WorkspaceCard");
    expect(source).toContain('"Draft semester" : "Semester"');
    expect(source).toContain('mediaSrc="/images/default_center_banner.jpg"');
    expect(source).toContain('"Continue setup" : "Open dashboard"');
    expect(source).toContain("<CalendarDays");
    expect(source).toContain(
      "editHref={canManageSemesters ? `/projects/${projectId}/centers/${centerId}/semesters/${semester.id}/edit` : undefined}",
    );
  });

  it("uses one contextual heading, immutable sorting, and static doodles", () => {
    expect(source).toContain("orderWorkspaceSemesters(semesters || [])");
    expect(source).toContain(
      'canManageSemesters || semester.status !== "DRAFT"',
    );
    expect(source).toContain(
      '<h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Semesters</h1>',
    );
    expect(source).toContain(
      "{center.name} · Choose a semester to open its dashboard and academic work.",
    );
    expect(source).toContain(
      "<DoodleBackground animated={false} numElements={6} />",
    );
    expect(source).toContain("Create the first semester");
    expect(source).toContain("No semester access yet");
    expect(source).toContain("Open dashboard");
  });

  it("formats semester date-only values in UTC", () => {
    expect(source).toContain("const formatSemesterDate");
    expect(source).toContain('timeZone: "UTC"');
    expect(source).toContain("formatSemesterDate(semester.startDate)");
    expect(source).toContain("formatSemesterDate(semester.endDate)");
  });
});
