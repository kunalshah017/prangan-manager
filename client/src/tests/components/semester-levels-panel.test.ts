import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildDashboardModel } from "@/lib/dashboard";
import type { User } from "@/types/api";

const panelSource = readFileSync(
  new URL("../../components/semesters/SemesterLevelsPanel.tsx", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("../../pages/semesters/Dashboard.tsx", import.meta.url),
  "utf8",
);

const user = (role: User["role"]): User => ({
  id: "user-1",
  name: "User",
  firstName: "User",
  email: "user@example.com",
  role,
  status: "APPROVED",
  roleAssignments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const context = { projectId: "p", centerId: "c", semesterId: "s" };

describe("semester levels panel", () => {
  it("lets only admins manage a semester's levels", () => {
    expect(buildDashboardModel(user("ADMIN"), context).capabilities.manageLevels).toBe(true);
    expect(buildDashboardModel(user("USER"), context).capabilities.manageLevels).toBe(false);
    expect(dashboardSource).toContain("canManage={dashboardModel.capabilities.manageLevels}");
  });

  it("saves through the semester levels endpoint and refreshes the semester", () => {
    expect(panelSource).toContain("useReplaceSemesterLevels");
    expect(panelSource).toContain("queryKeys.semester(semesterId)");
  });

  it("never turns off a level that still has enrolled students", () => {
    expect(panelSource).toContain("const isLocked = isChecked && studentCount > 0;");
    expect(panelSource).toContain("disabled={isLocked || replaceMutation.isPending}");
  });

  it("points to the shared level catalogue", () => {
    expect(panelSource).toContain('to="/academic-levels"');
  });
});
