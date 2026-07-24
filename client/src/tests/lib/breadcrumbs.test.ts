import { describe, expect, it } from "vitest";

import { buildBreadcrumbs } from "@/lib/breadcrumbs";

const ids = {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
};

const names = {
  projectName: "Chanchalmann",
  centerName: "Tulip",
  semesterName: "Semester Year 2025-26",
};

describe("buildBreadcrumbs", () => {
  it.each([
    {
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
      params: ids,
      expected: [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        ["Semester Year 2025-26", undefined],
      ],
    },
    {
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students",
      params: ids,
      expected: [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        [
          "Semester Year 2025-26",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
        ],
        ["Students", undefined],
      ],
    },
    {
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students/new",
      params: ids,
      expected: [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        [
          "Semester Year 2025-26",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
        ],
        [
          "Students",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students",
        ],
        ["New Student", undefined],
      ],
    },
    {
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus/syllabus-1/edit",
      params: { ...ids, syllabusId: "syllabus-1" },
      expected: [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        [
          "Semester Year 2025-26",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
        ],
        [
          "Curriculum",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus",
        ],
        ["Edit Syllabus", undefined],
      ],
    },
    {
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams/exam-1/scores",
      params: { ...ids, examId: "exam-1" },
      expected: [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        [
          "Semester Year 2025-26",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard",
        ],
        [
          "Exams",
          "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams",
        ],
        ["Exam Scores", undefined],
      ],
    },
  ])(
    "builds the semantic trail for $pathname",
    ({ pathname, params, expected }) => {
      const breadcrumbs = buildBreadcrumbs({ pathname, params, names });

      expect(breadcrumbs.map(({ label, href }) => [label, href])).toEqual(
        expected,
      );
      expect(breadcrumbs.at(-1)?.isCurrentPage).toBe(true);
      expect(
        breadcrumbs.slice(0, -1).every((item) => !item.isCurrentPage),
      ).toBe(true);
      const hrefs = breadcrumbs.flatMap((item) =>
        item.href ? [item.href] : [],
      );
      expect(new Set(hrefs).size).toBe(hrefs.length);
    },
  );

  it.each([
    ["/projects", {}, []],
    [
      "/projects/new",
      {},
      [
        ["Projects", "/projects"],
        ["New Project", undefined],
      ],
    ],
    [
      "/projects/project-1/edit",
      { id: "project-1" },
      [
        ["Projects", "/projects"],
        ["Edit Project", undefined],
      ],
    ],
    [
      "/projects/project-1/centers",
      { projectId: "project-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/new",
      { projectId: "project-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["New Center", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/edit",
      { projectId: "project-1", id: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Edit Center", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/semesters",
      { projectId: "project-1", centerId: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/semesters/new",
      { projectId: "project-1", centerId: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        ["New Semester", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/semesters/semester-1/edit",
      { projectId: "project-1", centerId: "center-1", id: "semester-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        ["Edit Semester", undefined],
      ],
    ],
    ["/users", {}, [["Users", undefined]]],
    [
      "/users/user-1/details",
      { userId: "user-1" },
      [
        ["Users", "/users"],
        ["User Details", undefined],
      ],
    ],
    ["/registration-requests", {}, [["Registration Requests", undefined]]],
    ["/library", {}, [["Library", undefined]]],
    ["/profile", {}, [["Profile", undefined]]],
    [
      "/profile/settings",
      {},
      [
        ["Profile", "/profile"],
        ["Settings", undefined],
      ],
    ],
  ] as const)("builds a useful trail for %s", (pathname, params, expected) => {
    const breadcrumbs = buildBreadcrumbs({ pathname, params, names });

    expect(breadcrumbs.map(({ label, href }) => [label, href])).toEqual(
      expected,
    );
  });

  it("labels the canonical remuneration route", () => {
    const breadcrumbs = buildBreadcrumbs({
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/remuneration",
      params: ids,
      names,
    });

    expect(breadcrumbs.at(-1)?.label).toBe("Remuneration");
  });

  it("labels semester-level user management", () => {
    const breadcrumbs = buildBreadcrumbs({
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/users",
      params: ids,
      names,
    });

    expect(breadcrumbs.at(-1)?.label).toBe("Semester users");
  });
});
