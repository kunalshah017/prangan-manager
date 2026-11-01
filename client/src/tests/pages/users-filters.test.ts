import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("user management filters", () => {
  it("renders the fetched center and semester options", async () => {
    const source = await readFile(
      new URL("../../pages/users/Users.tsx", import.meta.url),
      "utf8",
    );

    // Semester names repeat across centres, so semesters follow the chosen centre.
    expect(source).toContain("centreSemesters.map");
    expect(source).toContain('centerFilter !== "ALL" && (');
    expect(source).toContain('setSemesterFilter("ALL");');
    // A single project is applied implicitly; centres follow the project.
    expect(source).toContain("const hasProjectChoice = projects.length > 1;");
    expect(source).toContain("{hasProjectChoice && (");
    expect(source).toContain("projectCentres.map");
    expect(source).not.toContain("will be populated dynamically");
  });

  it("preserves and displays managed educator memberships", async () => {
    const [edit, details, users, hooks, display] = await Promise.all([
      readFile(
        new URL("../../pages/users/EditUser.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../components/users/UserProfileView.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../pages/users/Users.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../hooks/useUserQueries.ts", import.meta.url), "utf8"),
      readFile(new URL("../../lib/user-display.ts", import.meta.url), "utf8"),
    ]);

    expect(edit).toContain("semesterLevelId: assignment.semesterLevelId");
    expect(edit).toContain("semesterLevel: assignment.semesterLevel");
    expect(edit).not.toContain("level: assignment.level");
    expect(hooks).toContain("semesterLevelId?: string");
    expect(hooks).not.toContain("level?: string");
    expect(details).toContain("levelName(assignment.semesterLevel)");
    expect(display).toContain("levelName(first.semesterLevel)");
    expect(users).toContain("assignmentSummary(user, centreNames)");
    expect(details).not.toContain("assignment.level");
    expect(users).not.toContain("assignment.level");
    expect(details).not.toContain("assignment.level.replace");
    expect(users).not.toContain("assignment.level.replace");
  });

  it("unifies people and pending registration review in one workspace", async () => {
    const [users, app, navigation] = await Promise.all([
      readFile(new URL("../../pages/users/Users.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../App.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../lib/navigation.ts", import.meta.url), "utf8"),
    ]);

    expect(users).toContain("useSearchParams");
    expect(users).toContain('view === "requests"');
    expect(users).toContain("href={`/users/${request.id}/review`}");
    expect(app).toContain('Navigate to="/users?view=requests" replace');
    expect(navigation).toContain('label: "Users"');
    expect(navigation).not.toContain('label: "Registration requests"');
  });

  it("passes the explicitly selected system role through review and offers a safe access revoke action", async () => {
    const [users, review, edit] = await Promise.all([
      readFile(new URL("../../pages/users/Users.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../pages/users/ReviewRegistration.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../pages/users/EditUser.tsx", import.meta.url), "utf8"),
    ]);

    // The chosen account type is sent as-is, with assignments only for volunteers.
    expect(review).toContain("status: 'APPROVED', role, roleAssignments");
    expect(review).toContain("<SystemRoleChoice");
    // Revoking is a confirmed danger-zone action on the edit page, not a list button.
    expect(users).not.toContain("useRevokeUserAccess");
    expect(edit).toContain('actionLabel="Revoke access"');
    expect(edit).toContain("useRevokeUserAccess");
    expect(edit).toContain('variant="danger"');
  });
});
