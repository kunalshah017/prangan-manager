import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("registration request rejection", () => {
  it("requires the approval workflow rather than silently applying a default reason", async () => {
    const source = await readFile(
      new URL("../../components/ui/user-approval-modal.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("quickReject");
    expect(source).not.toContain(
      "Application does not meet the minimum requirements.",
    );
    expect(source).toContain("RejectionReasonModal");
  });

  it("opens the default volunteer assignment editor without a second role click", async () => {
    const source = await readFile(
      new URL("../../components/ui/user-approval-modal.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      "useState<RoleAssignment[]>([{ subRole: 'TRAINING_DEVELOPMENT' }])",
    );
    expect(source).toContain(
      "Complete the assignment fields to approve this volunteer.",
    );
  });

  it("uses a full-height mobile sheet with a bounded content scroller and compact safe-area actions", async () => {
    const source = await readFile(
      new URL("../../components/ui/user-approval-modal.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("z-[100]");
    expect(source).toContain("flex h-full max-h-[100dvh] flex-col");
    expect(source).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(source).toContain("grid grid-cols-2");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("createPortal");
    expect(source).toContain("document.body");
  });

  it("keeps both rejection actions readable with explicit white text", async () => {
    const [approval, rejection] = await Promise.all([
      readFile(
        new URL("../../components/ui/user-approval-modal.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../components/ui/rejection-reason-modal.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(approval).toContain("text-white hover:text-white");
    expect(rejection).toContain("text-white hover:text-white");
  });
});
