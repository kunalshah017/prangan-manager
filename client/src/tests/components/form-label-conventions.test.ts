import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? collectTsxFiles(path)
      : extname(entry.name) === ".tsx"
        ? [path]
        : [];
  });
}

const sources = collectTsxFiles(sourceRoot).map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

describe("form label conventions", () => {
  it("does not annotate optional inputs in labels or placeholders", () => {
    for (const { path, source } of sources) {
      expect(source, path).not.toMatch(/\(optional\)/i);
      expect(source, path).not.toMatch(/placeholder=["']Optional\b/i);
    }
  });

  it("renders every required-field star with the destructive color token", () => {
    for (const { path, source } of sources) {
      expect(source, path).not.toMatch(/label=["'][^"']*\*[^"']*["']/);
      expect(source, path).not.toMatch(
        /^\s*(?:[A-Z][\w /()-]*?)\s+\*\s*$/gm,
      );

      const starSpans = source.matchAll(
        /<span(?<attributes>[^>]*)>\s*\*\s*<\/span>/g,
      );
      for (const match of starSpans) {
        expect(match.groups?.attributes, path).toContain("text-destructive");
      }
    }
  });
});
