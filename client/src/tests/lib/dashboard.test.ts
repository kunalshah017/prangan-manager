import { describe, expect, it } from "vitest";

import { buildDashboardModel } from "@/lib/dashboard";
import type { User } from "@/types/api";

const context = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const user = (
  subRole: NonNullable<User["roleAssignments"]>[number]["subRole"],
  level?: "LEVEL_2",
): User => ({
  id: subRole,
  name: subRole,
  firstName: subRole,
  email: `${subRole.toLowerCase()}@example.test`,
  role: "USER",
  status: "APPROVED",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  roleAssignments: [
    {
      id: `${subRole}-assignment`,
      subRole,
      isActive: true,
      ...context,
      semesterLevelId: level ? "semester-level-2" : undefined,
      level,
    },
  ],
});

const admin: User = {
  ...user("TECH"),
  id: "admin",
  name: "Admin",
  email: "admin@example.test",
  role: "ADMIN",
};

const labels = (model: ReturnType<typeof buildDashboardModel>) =>
  model.actionGroups.flatMap((group) =>
    group.actions.map((action) => action.label),
  );

describe("buildDashboardModel", () => {
  it("gives admins the complete semester workspace", () => {
    const model = buildDashboardModel(admin, context);

    expect(model.visibility).toEqual({
      students: true,
      studentAttendance: true,
      staff: true,
      staffAttendance: true,
      curriculum: true,
      exams: true,
    });
    expect(labels(model)).toEqual([
      "View students",
      "Mark student attendance",
      "View student attendance",
      "Curriculum",
      "Exams",
      "Library",
      "Semester users",
      "Mark staff attendance",
      "View staff attendance",
      "Remuneration",
      "Expenses",
    ]);
    expect(model.actionGroups.map((group) => group.label)).not.toContain(
      "Administration",
    );
  });

  it("gives center managers student and staff operations without administration", () => {
    const model = buildDashboardModel(user("CENTER_MANAGER"), context);

    expect(model.assignedLevel).toBeUndefined();
    expect(model.assignedSemesterLevelId).toBeUndefined();
    expect(model.visibility).toEqual({
      students: true,
      studentAttendance: true,
      staff: true,
      staffAttendance: true,
      curriculum: true,
      exams: true,
    });
    expect(labels(model)).toEqual([
      "View students",
      "Mark student attendance",
      "View student attendance",
      "Curriculum",
      "Exams",
      "Library",
      "Semester users",
      "Mark staff attendance",
      "View staff attendance",
      "Remuneration",
    ]);
  });

  it("limits educators to assigned-level learning operations", () => {
    const model = buildDashboardModel(user("EDUCATOR", "LEVEL_2"), context);

    expect(model.assignedLevel).toBe("LEVEL_2");
    expect(model.assignedSemesterLevelId).toBe("semester-level-2");
    expect(model.visibility).toEqual({
      students: true,
      studentAttendance: true,
      staff: false,
      staffAttendance: false,
      curriculum: true,
      exams: true,
    });
    expect(labels(model)).toEqual([
      "View students",
      "Mark student attendance",
      "View student attendance",
      "Curriculum",
      "Exams",
      "Library",
    ]);
    expect(
      model.actionGroups.flatMap((group) =>
        group.actions.map((action) => action.mobileLabel),
      ),
    ).toEqual([
      "Students",
      "Mark students",
      "Student records",
      "Curriculum",
      "Exams",
      "Library",
    ]);
  });

  it("keeps curriculum mentors focused on curriculum and exams", () => {
    const model = buildDashboardModel(user("CURRICULUM_MENTOR"), context);

    expect(model.visibility).toEqual({
      students: false,
      studentAttendance: false,
      staff: false,
      staffAttendance: false,
      curriculum: true,
      exams: true,
    });
    expect(labels(model)).toEqual(["Curriculum", "Exams", "Library"]);
  });

  it("shows the Library to roles without academic permissions", () => {
    const model = buildDashboardModel(user("TECH"), context);

    expect(Object.values(model.visibility).every((value) => !value)).toBe(true);
    expect(labels(model)).toEqual(["Library"]);
    expect(
      model.actionGroups
        .flatMap((group) => group.actions)
        .find((action) => action.label === "Library"),
    ).toMatchObject({
      href: "/library?semesterId=semester-1",
      icon: "library",
    });
  });
});
