import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const drawerPath = new URL(
  "../../components/navigation/MobileNavigation.tsx",
  import.meta.url,
);

describe("MobileNavigation", () => {
  it("uses a three-row accessible modal drawer without an absolute footer", () => {
    expect(existsSync(drawerPath)).toBe(true);
    if (!existsSync(drawerPath)) return;
    const source = readFileSync(drawerPath, "utf8");

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(source).toContain("overflow-y-auto");
    expect(source).toContain("{canViewWorkspace && (");
    expect(source).not.toContain("absolute bottom-0");
    expect(source).not.toContain("max-h-[calc");
    expect(source).toContain("w-[min(88vw,20rem)]");
  });

  it("manages focus, Escape, backdrop close, and body scroll lock", () => {
    expect(existsSync(drawerPath)).toBe(true);
    if (!existsSync(drawerPath)) return;
    const source = readFileSync(drawerPath, "utf8");

    expect(source).toContain("closeButtonRef.current?.focus()");
    expect(source).toContain("previouslyFocusedElement.current?.focus()");
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('document.body.style.overflow = "hidden"');
    expect(source).toContain("onClick={onClose}");
  });
});
