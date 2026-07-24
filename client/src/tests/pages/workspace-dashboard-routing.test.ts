import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { buildNavigationModel } from "@/lib/navigation";
import type { User } from "@/types/api";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = read("../../App.tsx");
const projectsSource = read("../../pages/projects/Projects.tsx");
const centersSource = read("../../pages/centers/Centers.tsx");
const administrationPath = new URL(
  "../../pages/AdministrationDashboard.tsx",
  import.meta.url,
);
const projectDashboardPath = new URL(
  "../../pages/projects/ProjectDashboard.tsx",
  import.meta.url,
);
const centerDashboardPath = new URL(
  "../../pages/centers/CenterDashboard.tsx",
  import.meta.url,
);
const semestersSource = read("../../pages/semesters/Semesters.tsx");
const transitionHooksSource = read(
  "../../hooks/useSemesterTransitionQueries.ts",
);
const semesterHooksSource = read("../../hooks/useSemesterQueries.ts");
const queryClientSource = read("../../lib/query-client.ts");
const apiTypesSource = read("../../types/api.ts");

const admin: User = {
  id: "admin-1",
  name: "Admin",
  firstName: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  status: "APPROVED",
  roleAssignments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("workspace scope dashboards", () => {
  it("registers protected administration, project, and center dashboard routes", () => {
    expect(appSource).toMatch(
      /path="\/administration"[\s\S]*?<ProtectedRoute requireAdmin>/,
    );
    expect(appSource).toContain('path=":projectId/dashboard"');
    expect(appSource).toContain(
      'path=":projectId/centers/:centerId/dashboard"',
    );
    expect(appSource).toContain(
      "import('./pages/centers/CenterDashboard')",
    );
    expect(appSource).toMatch(
      /path=":projectId\/centers\/:centerId\/dashboard"[\s\S]*?element={<CenterDashboard \/>}/,
    );
    expect(appSource).toContain('path=":projectId/centers"');
    expect(appSource).toContain(
      'path=":projectId/centers/:centerId/semesters"',
    );
  });

  it("opens project and center dashboards from workspace cards", () => {
    expect(projectsSource).toContain("projectCardDestination(project.id)");
    expect(centersSource).toContain(
      "centerCardDestination(projectId, center.id)",
    );
  });

  it("uses dashboard destinations for the hierarchy breadcrumbs", () => {
    expect(
      buildBreadcrumbs({
        pathname:
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
        params: {
          projectId: "project-1",
          centerId: "center-1",
          semesterId: "semester-1",
        },
        names: {
          projectName: "Chanchalmann",
          centerName: "Tulip",
          semesterName: "2026",
        },
      }).map(({ label, href }) => [label, href]),
    ).toEqual([
      ["Projects", "/projects"],
      ["Chanchalmann", "/projects/project-1/dashboard"],
      ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
      ["2026", undefined],
    ]);
  });

  it("exposes one global administration dashboard destination", () => {
    expect(buildNavigationModel(admin).administration).toContainEqual({
      label: "Administration",
      href: "/administration",
      icon: "layout-dashboard",
    });
  });

  it("provides scoped dashboard pages with their owned data and actions", () => {
    expect(existsSync(administrationPath)).toBe(true);
    expect(existsSync(projectDashboardPath)).toBe(true);
    expect(existsSync(centerDashboardPath)).toBe(true);
    if (
      !existsSync(administrationPath) ||
      !existsSync(projectDashboardPath) ||
      !existsSync(centerDashboardPath)
    ) {
      return;
    }

    const administrationSource = read("../../pages/AdministrationDashboard.tsx");
    expect(administrationSource).toContain("useProjects()");
    expect(administrationSource).toContain("useUsers()");
    expect(administrationSource).toContain("useRegistrationRequests()");
    expect(administrationSource).toContain("Registration requests");
    expect(administrationSource).toContain("Academic levels");
    expect(administrationSource).toContain("No projects yet");
    expect(administrationSource).toContain("Try again");

    const projectDashboardSource = read(
      "../../pages/projects/ProjectDashboard.tsx",
    );
    expect(projectDashboardSource).toContain("useProject(projectId)");
    expect(projectDashboardSource).toContain(
      "useCentersByProject(projectId)",
    );
    expect(projectDashboardSource).toContain("New center");
    expect(projectDashboardSource).toContain("View all centers");
    expect(projectDashboardSource).toContain("<ExpandableText");
    expect(projectDashboardSource).toContain("compact");
    expect(projectDashboardSource).not.toContain('title="Project tools"');
    expect(projectDashboardSource).not.toContain("<WorkspaceToolGrid");
    expect(projectDashboardSource).toContain(
      "centerCardDestination(projectId, center.id)",
    );

    const centerDashboardSource = read(
      "../../pages/centers/CenterDashboard.tsx",
    );
    expect(centerDashboardSource).toContain("useCenter(centerId)");
    expect(centerDashboardSource).toContain(
      "useSemestersByCenter(centerId)",
    );
    expect(centerDashboardSource).toContain("semesterCardDestination(");
    expect(centerDashboardSource).toContain("View all semesters");
    expect(centerDashboardSource).toContain("<ExpandableText");
    expect(centerDashboardSource).toContain("compact");
    expect(centerDashboardSource).not.toContain('title="Center tools"');
    expect(centerDashboardSource).not.toContain("<WorkspaceToolGrid");
    expect(centerDashboardSource).toContain("useSemesterSetupSummaries(");
    expect(centerDashboardSource).toContain("Resume semester setup");
    expect(centerDashboardSource).toContain(
      'aria-label={`${label}: ${normalizedResolved} of ${normalizedTotal} complete`}',
    );
    expect(centerDashboardSource).toContain(
      "setupSummariesQuery.data || []",
    );
    expect(centerDashboardSource).toContain(
      'semester.status !== "DRAFT"',
    );
    expect(centersSource).toContain("Back to project dashboard");
    expect(centersSource).toContain(
      "to={`/projects/${projectId}/dashboard`}",
    );
    expect(semestersSource).toContain("Back to center dashboard");
    expect(semestersSource).toContain(
      "to={`/projects/${projectId}/centers/${centerId}/dashboard`}",
    );
    expect(projectsSource).toContain("Open administration");
    expect(projectsSource).toContain('to="/administration"');
  });

  it("loads count-only setup summaries for administrators without loading full plans", () => {
    expect(transitionHooksSource).toContain(
      "export const useSemesterSetupSummaries",
    );
    expect(transitionHooksSource).toContain(
      "`/semesters/center/${centerId}/setup-summaries`",
    );
    expect(transitionHooksSource).toContain("enabled: Boolean(centerId) && enabled");
    expect(
      read("../../pages/centers/CenterDashboard.tsx"),
    ).not.toContain("useSemesterTransition(");
    expect(apiTypesSource).toContain("SemesterSetupSummary");
    expect(apiTypesSource).toContain("SemesterSetupSummariesResponse");
    expect(queryClientSource).toContain(
      "export const semesterSetupSummariesKey",
    );
    expect(transitionHooksSource).toContain(
      'import { semesterSetupSummariesKey } from "@/lib/query-client"',
    );
    expect(
      transitionHooksSource.match(
        /queryKey: semesterSetupSummariesKey\(/g,
      ),
    ).toHaveLength(4);
    expect(semesterHooksSource).toContain(
      'import { queryKeys, semesterSetupSummariesKey } from "@/lib/query-client"',
    );
    expect(semesterHooksSource).toContain(
      "onSuccess: (response) =>",
    );
    expect(semesterHooksSource).toContain(
      "semesterSetupSummariesKey(response.semester.centerId)",
    );
  });

  it("keeps the semester list on shared ordering and destination helpers", () => {
    expect(semestersSource).toContain("orderWorkspaceSemesters(");
    expect(semestersSource).toContain("semesterCardDestination(");
  });

  it("does not expose draft setup destinations to non-administrators", () => {
    expect(semestersSource).toContain("const canManageSemesters = isAdmin()");
    expect(semestersSource).toContain(
      'canManageSemesters || semester.status !== "DRAFT"',
    );
    expect(semestersSource).toContain(
      "{canManageSemesters && (",
    );
  });

  it("keeps setup-summary loading and errors inside the draft section", () => {
    const centerDashboardSource = read(
      "../../pages/centers/CenterDashboard.tsx",
    );
    expect(centerDashboardSource).toContain(
      "mergeDraftSetupSummaries(semesters, setupSummaries)",
    );
    expect(centerDashboardSource).toContain(
      "setupSummariesQuery.isLoading",
    );
    expect(centerDashboardSource).toContain(
      "setupSummariesQuery.isError",
    );
    expect(centerDashboardSource).toContain(
      "setupSummariesQuery.refetch()",
    );
    expect(centerDashboardSource).not.toMatch(
      /const error =[\s\S]*setupSummariesQuery\.error/,
    );
    expect(centerDashboardSource).toContain("aria-valuemax={100}");
    expect(centerDashboardSource).toContain(
      "aria-valuenow={percentage}",
    );
    expect(centerDashboardSource).toContain("Progress unavailable");
    expect(centerDashboardSource).toContain('role="status"');
    expect(centerDashboardSource).toContain(
      "summary.progressAvailable ? (",
    );
  });
});
