import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const navItemPath = new URL(
  "../../components/navigation/NavItem.tsx",
  import.meta.url,
);
const toolsPath = new URL(
  "../../components/navigation/ContextTools.tsx",
  import.meta.url,
);

describe("navigation primitives", () => {
  it("renders accessible themed active navigation rows", () => {
    expect(existsSync(navItemPath)).toBe(true);
    if (!existsSync(navItemPath)) return;
    const source = readFileSync(navItemPath, "utf8");

    expect(source).toContain("min-h-11");
    expect(source).toContain('aria-current={isActive ? "page" : undefined}');
    expect(source).toContain("bg-primary");
    expect(source).toContain("ICON_COMPONENTS");
    expect(source).not.toMatch(/[📁📍📅👥]/u);
  });

  it("does not retain the removed contextual-tools primitive", () => {
    expect(existsSync(toolsPath)).toBe(false);
  });
});
