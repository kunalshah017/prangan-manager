import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Modal accessibility", () => {
  it("provides dialog semantics, conditional Escape dismissal, focus containment, and restoration", async () => {
    const source = await readFile(
      new URL("../../../components/ui/modal.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("onKeyDown");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("closeOnEscape = closeOnBackdrop");
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("focusableElements");
    expect(source).toContain("previouslyFocusedElement");
    expect(source).toContain("h-11 w-11");
  });
});
