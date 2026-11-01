import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("registration review", () => {
  it("reviews each application on its own page instead of stacked dialogs", async () => {
    const [app, users] = await Promise.all([read("../../App.tsx"), read("../../pages/users/Users.tsx")]);
    expect(app).toContain('<Route path=":userId/review" element={<ReviewRegistration />} />');
    expect(users).toContain("href={`/users/${request.id}/review`}");
    for (const retired of [
      "../../components/ui/user-approval-modal.tsx",
      "../../components/ui/rejection-reason-modal.tsx",
      "../../pages/RegistrationRequests.tsx",
    ]) {
      expect(existsSync(new URL(retired, import.meta.url))).toBe(false);
    }
  });

  it("can reject without emailing the applicant, needing no reason then", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("Email them the reason");
    expect(review).toContain("sendEmail: emailApplicant");
    expect(review).toContain("disabled={emailApplicant && !reason.trim()}");
    expect(review).toContain("'Reject without email'");
  });

  it("requires a written reason to reject, said to the applicant, on the same page", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("rejectionReason: emailApplicant ? reason.trim() : undefined");
    expect(review).toContain("Sent to the applicant by email");
    expect(review).not.toContain("createPortal");
  });

  it("starts volunteers with one assignment and only approves valid access", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("useState<RoleAssignment[]>([{ subRole: 'EDUCATOR' }])");
    expect(review).toContain("role === 'ADMIN' || (assignments.length > 0 && assignmentsValid)");
    expect(review).toContain("const roleAssignments = role === 'USER' ? assignments : undefined;");
    // An application decided elsewhere cannot be decided twice; restoring needs a revoked person.
    expect(review).toContain("applicant.status !== (restoring ? 'REJECTED' : 'PENDING')");
  });

  it("restores a revoked person on the same page: roles and rates, sent together, email optional", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    const app = await read("../../App.tsx");
    const users = await read("../../pages/users/Users.tsx");
    expect(app).toContain('<ReviewRegistration mode="restore" />');
    expect(review).toContain("restoreAccess.mutateAsync({ userId, role, roleAssignments, remunerationPeriods, sendEmail: emailApplicant })");
    expect(review).toContain("verifyUser.mutateAsync({ userId, status: 'APPROVED', role, roleAssignments, remunerationPeriods })");
    expect(review).toContain("Email them that their access is back");
    expect(review).not.toContain("saveRate");
    expect(users).toContain("href={`/users/${user.id}/restore`}");
    expect(users).toContain('user.status === "REJECTED"');
  });

  it("keeps the decision within thumb reach on phones", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("fixed inset-x-0 bottom-0");
    expect(review).toContain("env(safe-area-inset-bottom)");
    expect(review).toContain("withMobileAction");
  });
});
