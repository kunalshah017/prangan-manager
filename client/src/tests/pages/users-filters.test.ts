import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("user management filters", () => {
  it("renders the fetched center and semester options", async () => {
    const source = await readFile(
      new URL("../../pages/users/Users.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("centers.map");
    expect(source).toContain("semesters.map");
    expect(source).not.toContain("will be populated dynamically");
  });

  it("preserves and displays managed educator memberships", async () => {
    const [edit, details, users, hooks] = await Promise.all([
      readFile(
        new URL("../../pages/users/EditUser.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../pages/users/UserDetails.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../pages/users/Users.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../hooks/useUserQueries.ts", import.meta.url), "utf8"),
    ]);

    expect(edit).toContain("semesterLevelId: assignment.semesterLevelId");
    expect(edit).toContain("semesterLevel: assignment.semesterLevel");
    expect(edit).not.toContain("level: assignment.level");
    expect(hooks).toContain("semesterLevelId?: string");
    expect(hooks).not.toContain("level?: string");
    expect(details).toContain("levelName(assignment.semesterLevel)");
    expect(users).toContain("levelName(assignment.semesterLevel)");
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
    expect(users).toContain("Review application");
    expect(app).toContain('Navigate to="/users?view=requests" replace');
    expect(navigation).toContain('label: "People"');
    expect(navigation).not.toContain('label: "Registration requests"');
  });

  it("passes the explicitly selected system role through review and offers a safe access revoke action", async () => {
    const [users, approvalModal] = await Promise.all([
      readFile(new URL("../../pages/users/Users.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../../components/ui/user-approval-modal.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(approvalModal).toContain("onApprove: (user: UserType, role:");
    expect(approvalModal).toContain("await onApprove(user, selectedRole");
    expect(users).toContain("role: selectedRole");
    expect(users).toContain("Revoke access");
    expect(users).toContain("useRevokeUserAccess");
  });
});
