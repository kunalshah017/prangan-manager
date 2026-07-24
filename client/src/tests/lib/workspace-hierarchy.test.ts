import { describe, expect, it } from "vitest";

import {
  centerCardDestination,
  orderWorkspaceSemesters,
  projectCardDestination,
  semesterCardDestination,
} from "@/lib/workspace-hierarchy";
import type { Semester } from "@/types/api";

const semester = (
  id: string,
  status: Semester["status"],
  updatedAt: string,
): Semester => ({
  id,
  name: id,
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-06-30T00:00:00.000Z",
  centerId: "center-1",
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
});

describe("workspace hierarchy destinations", () => {
  it("opens project cards on the project dashboard", () => {
    expect(projectCardDestination("project-1")).toBe(
      "/projects/project-1/dashboard",
    );
  });

  it("opens center cards on the center dashboard", () => {
    expect(centerCardDestination("project-1", "center-1")).toBe(
      "/projects/project-1/centers/center-1/dashboard",
    );
  });

  it("opens draft semester cards on setup", () => {
    expect(
      semesterCardDestination(
        "project-1",
        "center-1",
        semester("semester-1", "DRAFT", "2026-07-24T00:00:00.000Z"),
      ),
    ).toBe(
      "/projects/project-1/centers/center-1/semesters/semester-1/setup",
    );
  });

  it.each(["ACTIVE", "ARCHIVED"] as const)(
    "opens %s semester cards on the semester dashboard",
    (status) => {
      expect(
        semesterCardDestination(
          "project-1",
          "center-1",
          semester("semester-1", status, "2026-07-24T00:00:00.000Z"),
        ),
      ).toBe(
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
      );
    },
  );
});

describe("workspace semester ordering", () => {
  it("groups drafts before active and archived semesters, newest first within each group", () => {
    const semesters = [
      semester("archived-new", "ARCHIVED", "2026-07-06T00:00:00.000Z"),
      semester("draft-old", "DRAFT", "2026-07-01T00:00:00.000Z"),
      semester("active-old", "ACTIVE", "2026-07-02T00:00:00.000Z"),
      semester("draft-new", "DRAFT", "2026-07-05T00:00:00.000Z"),
      semester("archived-old", "ARCHIVED", "2026-07-03T00:00:00.000Z"),
      semester("active-new", "ACTIVE", "2026-07-04T00:00:00.000Z"),
    ];
    const originalOrder = semesters.map(({ id }) => id);

    const ordered = orderWorkspaceSemesters(semesters);

    expect(ordered.map(({ id }) => id)).toEqual([
      "draft-new",
      "draft-old",
      "active-new",
      "active-old",
      "archived-new",
      "archived-old",
    ]);
    expect(semesters.map(({ id }) => id)).toEqual(originalOrder);
    expect(ordered).not.toBe(semesters);
  });
});
