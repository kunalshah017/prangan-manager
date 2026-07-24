import { describe, expect, it } from "vitest";

import {
  buildNavigationModel,
  getNavigationContextFromPathname,
  isAdministrationPathActive,
} from "@/lib/navigation";
import type { User } from "@/types/api";

const context = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const assignment = (
  subRole: NonNullable<User["roleAssignments"]>[number]["subRole"],
) => ({
  id: `assignment-${subRole}`,
  subRole,
  projectId: context.projectId,
  centerId: context.centerId,
  semesterId: context.semesterId,
  level: "LEVEL_1" as const,
  isActive: true,
});

const user = (
  subRole?: NonNullable<User["roleAssignments"]>[number]["subRole"],
  role: User["role"] = "USER",
): User => ({
  id: "user-1",
  name: role === "ADMIN" ? "Admin" : subRole || "Unassigned",
  firstName: role === "ADMIN" ? "Admin" : subRole || "Unassigned",
  email: "user@example.com",
  role,
  status: "APPROVED",
  roleAssignments: subRole ? [assignment(subRole)] : [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("role-aware navigation model", () => {
  it("keeps contextual tools on dashboards instead of duplicating them in navigation", () => {
    const model = buildNavigationModel(user(undefined, "ADMIN"));

    expect(model).not.toHaveProperty("contextGroups");
    expect(model).not.toHaveProperty("contextNavigation");
    expect(model.administration.map((link) => link.label)).toEqual([
      "Administration",
      "Levels",
      "People",
    ]);
  });

  it("does not duplicate contextual tools for non-administrators", () => {
    const model = buildNavigationModel(user("CENTER_MANAGER"));
    expect(model).not.toHaveProperty("contextGroups");
    expect(model).not.toHaveProperty("contextNavigation");
    expect(model.administration).toEqual([]);
  });

  it("keeps educators out of staff attendance and administration", () => {
    const model = buildNavigationModel(user("EDUCATOR"));
    expect(model).not.toHaveProperty("contextGroups");
    expect(model).not.toHaveProperty("contextNavigation");
    expect(model.administration).toEqual([]);
  });

  it("does not duplicate curriculum mentor tools in navigation", () => {
    const model = buildNavigationModel(user("CURRICULUM_MENTOR"));
    expect(model).not.toHaveProperty("contextGroups");
    expect(model).not.toHaveProperty("contextNavigation");
  });

  it("keeps app-level resources universal rather than duplicating them in semester tools", () => {
    const model = buildNavigationModel(user("TECH"));
    expect(model).not.toHaveProperty("contextGroups");
    expect(model.administration).toEqual([]);
    expect(model.universal.map((link) => link.label)).toEqual(["Library"]);
  });

  it("does not add contextual menus at any route depth", () => {
    const admin = user(undefined, "ADMIN");

    const projectModel = buildNavigationModel(admin);
    expect(projectModel).not.toHaveProperty("contextGroups");
    expect(projectModel).not.toHaveProperty("contextNavigation");

    const centerModel = buildNavigationModel(admin);
    expect(centerModel).not.toHaveProperty("contextGroups");
    expect(centerModel).not.toHaveProperty("contextNavigation");
    expect(buildNavigationModel(admin)).not.toHaveProperty(
      "contextNavigation",
    );
    expect(buildNavigationModel(user("TECH"))).not.toHaveProperty(
      "contextNavigation",
    );
  });
});

describe("navigation route context", () => {
  it.each([
    ["/projects/new", {}],
    ["/projects/project-1/dashboard", { projectId: "project-1" }],
    [
      "/projects/project-1/centers/new",
      { projectId: "project-1" },
    ],
    [
      "/projects/project-1/centers/center-1/dashboard",
      { projectId: "project-1", centerId: "center-1" },
    ],
    [
      "/projects/project-1/centers/center-1/semesters/new",
      { projectId: "project-1", centerId: "center-1" },
    ],
    [
      "/projects/project-1/centers/center-1/semesters/semester-1/setup",
      context,
    ],
    [
      "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students",
      context,
    ],
    ["/academic-levels", {}],
  ])("derives context from %s without treating new as an id", (pathname, expected) => {
    expect(getNavigationContextFromPathname(pathname)).toEqual(expected);
  });

  it.each([
    "/administration",
    "/academic-levels",
    "/users",
    "/users/user-1",
    "/registration-requests",
  ])("marks %s as administration navigation", (pathname) => {
    expect(isAdministrationPathActive(pathname)).toBe(true);
  });

  it.each(["/projects", "/projects/project-1/dashboard", "/library"])(
    "does not mark %s as administration navigation",
    (pathname) => {
      expect(isAdministrationPathActive(pathname)).toBe(false);
    },
  );
});
