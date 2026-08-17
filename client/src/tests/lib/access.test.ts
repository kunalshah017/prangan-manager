import { describe, expect, it } from "vitest";

import { can } from "@/lib/access";
import type { User } from "@/types/api";

const context = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-level-1",
};

const user = (assignments: NonNullable<User["roleAssignments"]>): User => ({
  id: "user-1",
  name: "Educator",
  firstName: "Educator",
  email: "educator@example.com",
  role: "USER",
  status: "APPROVED",
  roleAssignments: assignments,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const assignment = (
  subRole: NonNullable<User["roleAssignments"]>[number]["subRole"],
  overrides: Partial<NonNullable<User["roleAssignments"]>[number]> = {},
) => ({
  id: "assignment-1",
  subRole,
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-level-1",
  isActive: true,
  ...overrides,
});

describe("client access policy", () => {
  it("lets administrators bypass workspace context", () => {
    const admin = { ...user([]), role: "ADMIN" as const };

    expect(
      can(admin, "students.manage", { ...context, centerId: "center-2" }),
    ).toBe(true);
  });

  it("allows a center manager only in an exact active context", () => {
    const manager = user([assignment("CENTER_MANAGER")]);

    expect(can(manager, "students.manage", context)).toBe(true);
    expect(
      can(manager, "students.manage", { ...context, centerId: "center-2" }),
    ).toBe(false);
    expect(
      can(manager, "students.manage", { ...context, semesterId: "semester-2" }),
    ).toBe(false);
    expect(can(manager, "exams.manage", context)).toBe(true);
    expect(can(manager, "curriculum.progress.write", context)).toBe(true);
  });

  it("restricts an educator to their exact assigned level", () => {
    const educator = user([assignment("EDUCATOR")]);

    expect(
      can(educator, "students.read", {
        ...context,
        semesterLevelId: undefined,
      }),
    ).toBe(true);
    expect(can(educator, "studentAttendance.write", context)).toBe(true);
    expect(
      can(educator, "studentAttendance.write", {
        ...context,
        semesterLevelId: "semester-level-2",
      }),
    ).toBe(false);
    expect(can(educator, "students.manage", context)).toBe(false);
  });

  it("requires matching managed semester level IDs when one is supplied", () => {
    const educator = user([assignment("EDUCATOR")]);

    expect(can(educator, "students.read", context)).toBe(true);
    expect(
      can(
        user([
          assignment("EDUCATOR", {
            semesterLevelId: undefined,
          }),
        ]),
        "students.read",
        context,
      ),
    ).toBe(false);
  });

  it("does not treat missing assignment scope fields as wildcards", () => {
    const incompleteAssignment = assignment("EDUCATOR", {
      centerId: undefined,
      semesterId: undefined,
    });

    expect(can(user([incompleteAssignment]), "students.read", context)).toBe(
      false,
    );
  });
});
