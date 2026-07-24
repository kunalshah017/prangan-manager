import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardPath = new URL(
  "../../components/workspace/WorkspaceCard.tsx",
  import.meta.url,
);

describe("WorkspaceCard", () => {
  it("provides an image-ready responsive semantic card", () => {
    expect(existsSync(cardPath)).toBe(true);
    if (!existsSync(cardPath)) return;

    const source = readFileSync(cardPath, "utf8");
    for (const prop of [
      "title: string",
      "entityLabel: string",
      "mediaSrc: string",
      "mediaAlt: string",
      "href: string",
      "openLabel: string",
      "detail: ReactNode",
      "updatedAt: string",
    ]) {
      expect(source).toContain(prop);
    }
    expect(source).toContain("<article");
    expect(source).toContain("h-[6.5rem]");
    expect(source).toContain("sm:h-auto sm:w-44");
    expect(source).toContain("object-cover");
    expect(source).toContain("border-t border-border");
    expect(source).toContain("h-11 w-11");
    expect(source).toContain("absolute inset-0");
    expect(source).toContain("motion-reduce:transform-none");
  });
});
