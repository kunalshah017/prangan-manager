export interface AppBreadcrumb {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
  isEllipsis?: boolean;
}

interface BreadcrumbParams {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  id?: string;
  userId?: string;
  syllabusId?: string;
  examId?: string;
}

interface BreadcrumbNames {
  projectName?: string;
  centerName?: string;
  semesterName?: string;
}

interface BuildBreadcrumbsOptions {
  pathname: string;
  params: BreadcrumbParams;
  names?: BreadcrumbNames;
}

const link = (label: string, href: string): AppBreadcrumb => ({ label, href });
const current = (label: string): AppBreadcrumb => ({
  label,
  isCurrentPage: true,
});

export const getBreadcrumbBackTarget = (
  breadcrumbs: AppBreadcrumb[],
): AppBreadcrumb | undefined =>
  [...breadcrumbs].reverse().find((item) => item.href);

export function buildBreadcrumbs({
  pathname,
  params,
  names = {},
}: BuildBreadcrumbsOptions): AppBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "profile") {
    return segments[1] === "settings"
      ? [
          link("Projects", "/projects"),
          link("Profile", "/profile"),
          current("Settings"),
        ]
      : [link("Projects", "/projects"), current("Profile")];
  }

  if (segments[0] === "registration-requests") {
    return [current("Registration Requests")];
  }

  if (segments[0] === "administration") {
    return [link("Projects", "/projects"), current("Administration")];
  }

  if (segments[0] === "academic-levels") {
    return [
      link("Administration", "/administration"),
      current("Academic Levels"),
    ];
  }

  if (segments[0] === "users") {
    if (segments[2] === "details") {
      return [
        link("Administration", "/administration"),
        link("Users", "/users"),
        current("User Details"),
      ];
    }
    if (segments[2] === "edit") {
      return [
        link("Administration", "/administration"),
        link("Users", "/users"),
        current("Edit User"),
      ];
    }
    return [link("Administration", "/administration"), current("Users")];
  }

  if (segments[0] === "library") {
    return segments[1]
      ? [
          link("Projects", "/projects"),
          link("Library", "/library"),
          current("Book"),
        ]
      : [link("Projects", "/projects"), current("Library")];
  }

  if (segments[0] !== "projects") return [];
  if (segments.length === 1) return [current("Projects")];

  const projects = link("Projects", "/projects");
  if (segments[1] === "new") return [projects, current("New Project")];
  if (segments[2] === "edit") return [projects, current("Edit Project")];

  const projectId = params.projectId;
  if (!projectId) return [projects];

  const projectName = names.projectName || "Project";
  const projectHref = `/projects/${projectId}/dashboard`;
  const centersHref = `/projects/${projectId}/centers`;
  if (segments[2] === "dashboard") return [projects, current(projectName)];
  if (segments[2] !== "centers") return [projects];
  if (segments.length === 3) {
    return [projects, link(projectName, projectHref), current("Centers")];
  }
  if (segments[3] === "new") {
    return [
      projects,
      link(projectName, projectHref),
      link("Centers", centersHref),
      current("New Center"),
    ];
  }
  if (segments[4] === "edit") {
    return [
      projects,
      link(projectName, projectHref),
      link("Centers", centersHref),
      current("Edit Center"),
    ];
  }

  const centerId = params.centerId;
  const centerName = names.centerName || "Center";
  const centerHref = `/projects/${projectId}/centers/${centerId}/dashboard`;
  const project = link(projectName, projectHref);
  if (centerId && segments[4] === "dashboard") {
    return [projects, project, current(centerName)];
  }
  if (!centerId || segments[4] !== "semesters") {
    return [projects, current(projectName)];
  }

  const semestersHref = `/projects/${projectId}/centers/${centerId}/semesters`;
  if (segments.length === 5) {
    return [
      projects,
      project,
      link(centerName, centerHref),
      current("Semesters"),
    ];
  }
  if (segments[5] === "new") {
    return [
      projects,
      project,
      link(centerName, centerHref),
      link("Semesters", semestersHref),
      current("New Semester"),
    ];
  }
  if (segments[6] === "edit") {
    return [
      projects,
      project,
      link(centerName, centerHref),
      link("Semesters", semestersHref),
      current("Edit Semester"),
    ];
  }

  const semesterId = params.semesterId;
  if (semesterId && segments[6] === "setup") {
    return [
      projects,
      project,
      link(centerName, centerHref),
      link("Semesters", semestersHref),
      current("Semester Setup"),
    ];
  }
  if (!semesterId || segments[6] !== "dashboard") {
    return [projects, project, current(centerName)];
  }

  const semesterName = names.semesterName || "Semester";
  const dashboardHref = `${semestersHref}/${semesterId}/dashboard`;
  const workspace = [projects, project, link(centerName, centerHref)];
  if (segments.length === 7) return [...workspace, current(semesterName)];

  const semester = link(semesterName, dashboardHref);
  const section = segments[7];
  const action = segments[8];
  const nestedAction = segments[9];

  if (section === "students") {
    const studentsHref = `${dashboardHref}/students`;
    if (!action) return [...workspace, semester, current("Students")];
    if (action === "new") {
      return [
        ...workspace,
        semester,
        link("Students", studentsHref),
        current("New Student"),
      ];
    }
    if (nestedAction === "edit") {
      return [
        ...workspace,
        semester,
        link("Students", studentsHref),
        current("Edit Student"),
      ];
    }
  }

  if (section === "users") {
    return [...workspace, semester, current("Semester users")];
  }

  if (section === "expenses") {
    return [...workspace, semester, current("Expenses")];
  }

  if (section === "attendance") {
    const labels: Record<string, string> = {
      view: "View Staff Attendance",
      mark: "Mark Staff Attendance",
      remuneration: "Remuneration",
      renumeration: "Remuneration",
    };
    return [
      ...workspace,
      semester,
      current(labels[action] || "Staff Attendance"),
    ];
  }

  if (section === "student-attendance") {
    return [
      ...workspace,
      semester,
      current(
        action === "mark"
          ? "Mark Student Attendance"
          : "View Student Attendance",
      ),
    ];
  }

  if (section === "syllabus") {
    const syllabusHref = `${dashboardHref}/syllabus`;
    if (!action) return [...workspace, semester, current("Curriculum")];
    const label =
      action === "create"
        ? "Create Syllabus"
        : nestedAction === "progress"
          ? "Syllabus Progress"
          : "Edit Syllabus";
    return [
      ...workspace,
      semester,
      link("Curriculum", syllabusHref),
      current(label),
    ];
  }

  if (section === "exams") {
    const examsHref = `${dashboardHref}/exams`;
    if (!action) return [...workspace, semester, current("Exams")];
    const label =
      action === "create"
        ? "Create Exam"
        : nestedAction === "scores"
          ? "Exam Scores"
          : "Edit Exam";
    return [...workspace, semester, link("Exams", examsHref), current(label)];
  }

  if (section === "bank-details") {
    return [...workspace, semester, current("Bank Details")];
  }

  return [...workspace, semester, current("Dashboard")];
}
