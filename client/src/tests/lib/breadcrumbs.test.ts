import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbs,
  getBreadcrumbBackTarget,
} from "@/lib/breadcrumbs";

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
    ["/projects", {}, [["Projects", undefined]]],
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
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Centers", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/new",
      { projectId: "project-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Centers", "/projects/project-1/centers"],
        ["New Center", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/edit",
      { projectId: "project-1", id: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Centers", "/projects/project-1/centers"],
        ["Edit Center", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/semesters",
      { projectId: "project-1", centerId: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        ["Semesters", undefined],
      ],
    ],
    [
      "/projects/project-1/centers/center-1/semesters/new",
      { projectId: "project-1", centerId: "center-1" },
      [
        ["Projects", "/projects"],
        ["Chanchalmann", "/projects/project-1/dashboard"],
        ["Tulip", "/projects/project-1/centers/center-1/dashboard"],
        [
          "Semesters",
          "/projects/project-1/centers/center-1/semesters",
        ],
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
        [
          "Semesters",
          "/projects/project-1/centers/center-1/semesters",
        ],
        ["Edit Semester", undefined],
      ],
    ],
    [
      "/users",
      {},
      [
        ["Administration", "/administration"],
        ["Users", undefined],
      ],
    ],
    [
      "/users/user-1/details",
      { userId: "user-1" },
      [
        ["Administration", "/administration"],
        ["Users", "/users"],
        ["User Details", undefined],
      ],
    ],
    ["/registration-requests", {}, [["Registration Requests", undefined]]],
    [
      "/library",
      {},
      [
        ["Projects", "/projects"],
        ["Library", undefined],
      ],
    ],
    [
      "/profile",
      {},
      [
        ["Projects", "/projects"],
        ["Profile", undefined],
      ],
    ],
    [
      "/profile/settings",
      {},
      [
        ["Projects", "/projects"],
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

  it.each([
    ["/administration", {}, "Administration"],
    ["/academic-levels", {}, "Academic Levels"],
    ["/users", {}, "Users"],
    ["/users/user-1/details", { userId: "user-1" }, "User Details"],
    ["/users/user-1/edit", { userId: "user-1" }, "Edit User"],
    ["/profile", {}, "Profile"],
    ["/profile/settings", {}, "Settings"],
    ["/library", {}, "Library"],
    ["/projects", {}, "Projects"],
    ["/projects/new", {}, "New Project"],
    ["/projects/project-1/edit", { id: "project-1" }, "Edit Project"],
    ["/projects/project-1/dashboard", { projectId: "project-1" }, "Chanchalmann"],
    ["/projects/project-1/centers", { projectId: "project-1" }, "Centers"],
    ["/projects/project-1/centers/new", { projectId: "project-1" }, "New Center"],
    ["/projects/project-1/centers/center-1/edit", { projectId: "project-1", id: "center-1" }, "Edit Center"],
    ["/projects/project-1/centers/center-1/dashboard", { projectId: "project-1", centerId: "center-1" }, "Tulip"],
    ["/projects/project-1/centers/center-1/semesters", ids, "Semesters"],
    ["/projects/project-1/centers/center-1/semesters/new", ids, "New Semester"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/edit", { ...ids, id: "semester-1" }, "Edit Semester"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/setup", ids, "Semester Setup"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard", ids, "Semester Year 2025-26"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students", ids, "Students"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students/new", ids, "New Student"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students/student-1/edit", { ...ids, id: "student-1" }, "Edit Student"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/users", ids, "Semester users"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/view", ids, "View Staff Attendance"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/mark", ids, "Mark Staff Attendance"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/attendance/remuneration", ids, "Remuneration"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/expenses", ids, "Expenses"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/student-attendance/view", ids, "View Student Attendance"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/student-attendance/mark", ids, "Mark Student Attendance"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus", ids, "Curriculum"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus/create", ids, "Create Syllabus"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus/syllabus-1/edit", { ...ids, syllabusId: "syllabus-1" }, "Edit Syllabus"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/syllabus/syllabus-1/progress", { ...ids, syllabusId: "syllabus-1" }, "Syllabus Progress"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams", ids, "Exams"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams/create", ids, "Create Exam"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams/exam-1/edit", { ...ids, examId: "exam-1" }, "Edit Exam"],
    ["/projects/project-1/centers/center-1/semesters/semester-1/dashboard/exams/exam-1/scores", { ...ids, examId: "exam-1" }, "Exam Scores"],
  ] as const)("covers the application route %s", (pathname, params, label) => {
    const breadcrumbs = buildBreadcrumbs({ pathname, params, names });

    expect(breadcrumbs.length).toBeGreaterThan(0);
    expect(breadcrumbs.at(-1)).toMatchObject({
      label,
      isCurrentPage: true,
    });
  });

  it("derives the immediate semantic parent for the shared back button", () => {
    const breadcrumbs = buildBreadcrumbs({
      pathname:
        "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students/student-1/edit",
      params: { ...ids, id: "student-1" },
      names,
    });

    expect(getBreadcrumbBackTarget(breadcrumbs)).toEqual({
      label: "Students",
      href: "/projects/project-1/centers/center-1/semesters/semester-1/dashboard/students",
    });
    expect(
      getBreadcrumbBackTarget(
        buildBreadcrumbs({ pathname: "/projects", params: {} }),
      ),
    ).toBeUndefined();
  });

  it.each([
    [
      "/projects/project-1/centers/new",
      { projectId: "project-1" },
      ["Centers", "/projects/project-1/centers"],
    ],
    [
      "/projects/project-1/centers/center-1/edit",
      { projectId: "project-1", id: "center-1" },
      ["Centers", "/projects/project-1/centers"],
    ],
    [
      "/projects/project-1/centers/center-1/semesters/new",
      ids,
      ["Semesters", "/projects/project-1/centers/center-1/semesters"],
    ],
    [
      "/projects/project-1/centers/center-1/semesters/semester-1/edit",
      { ...ids, id: "semester-1" },
      ["Semesters", "/projects/project-1/centers/center-1/semesters"],
    ],
  ] as const)(
    "returns %s to its immediate list",
    (pathname, params, [label, href]) => {
      const target = getBreadcrumbBackTarget(
        buildBreadcrumbs({ pathname, params, names }),
      );

      expect([target?.label, target?.href]).toEqual([label, href]);
    },
  );
});
