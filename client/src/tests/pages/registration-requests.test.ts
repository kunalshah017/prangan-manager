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

  it("requires a written reason to reject, said to the applicant, on the same page", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("disabled={!reason.trim()}");
    expect(review).toContain("rejectionReason: reason.trim()");
    expect(review).toContain("Sent to the applicant by email");
    expect(review).not.toContain("createPortal");
  });

  it("starts volunteers with one assignment and only approves valid access", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("useState<RoleAssignment[]>([{ subRole: 'EDUCATOR' }])");
    expect(review).toContain("role === 'ADMIN' || (assignments.length > 0 && assignmentsValid)");
    expect(review).toContain("roleAssignments: role === 'USER' ? assignments : undefined");
    // An application decided elsewhere cannot be decided twice.
    expect(review).toContain("applicant.status !== 'PENDING'");
  });

  it("keeps the decision within thumb reach on phones", async () => {
    const review = await read("../../pages/users/ReviewRegistration.tsx");
    expect(review).toContain("fixed inset-x-0 bottom-0");
    expect(review).toContain("env(safe-area-inset-bottom)");
    expect(review).toContain("withMobileAction");
  });
});
